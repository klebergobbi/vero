import { createHmac, timingSafeEqual } from "node:crypto";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import PDFDocument from "pdfkit";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import type { Env } from "../config/env.validation";
import { PrismaService } from "../prisma/prisma.service";
import { REPORT_BUILDER_QUEUE } from "./report.constants";

const SIGNED_URL_TTL_SECONDS = 300; // 5 min

const REPORT_SELECT = {
  id: true,
  type: true,
  format: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  rowCount: true,
  error: true,
  createdAt: true,
} satisfies Prisma.ReportSelect;

function brl(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
function dt(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}
function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

const TYPE_LABEL: Record<string, string> = {
  BILLING: "Faturamento",
  NO_SHOW: "Faltas e desmarcações",
};

/**
 * Engine de relatórios (§6/S43): catálogo de relatórios exportáveis (faturamento,
 * faltas/desmarcações) gerados em BACKGROUND (fila `report-builder`). O conteúdo
 * (CSV/PDF) é construído a partir dos dados do período e servido por URL assinada
 * de expiração curta (mesmo padrão do recibo S24). Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class ReportService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
    @InjectQueue(REPORT_BUILDER_QUEUE) private readonly queue: Queue,
  ) {
    this.secret = config.get("JWT_SECRET", { infer: true });
  }

  /** Solicita um relatório (cria PENDING + enfileira a geração em background). */
  async request(
    tenantId: string,
    input: {
      type: string;
      format: string;
      periodStart: string;
      periodEnd: string;
    },
  ) {
    const report = await this.prisma.report.create({
      data: {
        tenantId,
        type: input.type as Prisma.ReportCreateInput["type"],
        format: input.format as Prisma.ReportCreateInput["format"],
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
      },
      select: REPORT_SELECT,
    });
    await this.queue.add(
      "build",
      { reportId: report.id },
      { jobId: `report-${report.id}` },
    );
    return report;
  }

  async list(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.report.findMany({
      where: scope.where<Prisma.ReportWhereInput>({}),
      orderBy: { createdAt: "desc" },
      select: REPORT_SELECT,
    });
  }

  /** Detalhe + URL assinada de download quando READY. */
  async get(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const report = await this.prisma.report.findFirst({
      where: scope.where<Prisma.ReportWhereInput>({ id }),
      select: REPORT_SELECT,
    });
    const owned = scope.ensureOwned(report); // 403 anti-IDOR
    return {
      ...owned,
      ...(owned.status === "READY" ? this.signedUrl(owned.id) : {}),
    };
  }

  // --- geração (chamada pelo worker) ---

  /** Constrói o relatório (consulta dados + gera CSV/PDF) e marca READY. */
  async build(reportId: string): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        tenantId: true,
        type: true,
        format: true,
        periodStart: true,
        periodEnd: true,
        status: true,
      },
    });
    if (!report || report.status === "READY") return;

    const rows =
      report.type === "BILLING"
        ? await this.billingRows(report.tenantId, report)
        : await this.noShowRows(report.tenantId, report);

    const content =
      report.format === "CSV"
        ? Buffer.from(this.toCsv(rows.header, rows.lines), "utf8")
        : await this.toPdf(report.type, report, rows.header, rows.lines);

    await this.prisma.report.update({
      where: { id: report.id },
      data: { status: "READY", content, rowCount: rows.lines.length },
    });
  }

  // --- builders de dados ---

  private async billingRows(
    tenantId: string,
    period: { periodStart: Date; periodEnd: Date },
  ) {
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        paidAt: { gte: period.periodStart, lte: period.periodEnd },
      },
      orderBy: { paidAt: "asc" },
      select: {
        amountCents: true,
        paidAt: true,
        charge: { select: { patient: { select: { name: true } } } },
      },
    });
    const lines = payments.map((p) => [
      dt(p.paidAt),
      p.charge.patient.name,
      brl(p.amountCents),
    ]);
    const total = payments.reduce((s, p) => s + p.amountCents, 0);
    lines.push(["", "TOTAL", brl(total)]);
    return { header: ["Data", "Paciente", "Valor"], lines };
  }

  private async noShowRows(
    tenantId: string,
    period: { periodStart: Date; periodEnd: Date },
  ) {
    const appts = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ["NO_SHOW", "CANCELLED"] },
        startsAt: { gte: period.periodStart, lte: period.periodEnd },
      },
      orderBy: { startsAt: "asc" },
      select: {
        startsAt: true,
        status: true,
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
    const lines = appts.map((a) => [
      dt(a.startsAt),
      a.patient.name,
      a.professional.name,
      a.status === "NO_SHOW" ? "Falta" : "Desmarcado",
    ]);
    return { header: ["Data", "Paciente", "Profissional", "Situação"], lines };
  }

  // --- export ---

  private toCsv(header: string[], lines: string[][]): string {
    const all = [header, ...lines];
    return all.map((r) => r.map(csvCell).join(";")).join("\r\n");
  }

  private toPdf(
    type: string,
    period: { periodStart: Date; periodEnd: Date },
    header: string[],
    lines: string[][],
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ size: "A4", margin: 48 });
      const chunks: Buffer[] = [];
      pdf.on("data", (c: Buffer) => chunks.push(c));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);

      pdf
        .fontSize(16)
        .text(TYPE_LABEL[type] ?? "Relatório", { align: "center" });
      pdf
        .fontSize(10)
        .fillColor("#666666")
        .text(`Período: ${dt(period.periodStart)} a ${dt(period.periodEnd)}`, {
          align: "center",
        });
      pdf.moveDown(1).fillColor("#000000");

      pdf.fontSize(10).text(header.join("  |  "));
      pdf.moveTo(48, pdf.y).lineTo(547, pdf.y).stroke();
      pdf.moveDown(0.3);
      for (const row of lines) {
        pdf.fontSize(9).text(row.join("  |  "));
      }
      pdf.end();
    });
  }

  // --- URL assinada (padrão recibo S24) ---

  signedUrl(reportId: string): { url: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const sig = this.hmac(`${reportId}.${exp}`);
    return {
      url: `/reports/file/${reportId}.${exp}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  async serveFile(token: string) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new NotFoundException();
    const [id, expStr, sig] = parts as [string, string, string];
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      throw new NotFoundException("Link expirado.");
    }
    if (!this.safeEqual(sig, this.hmac(`${id}.${exp}`))) {
      throw new NotFoundException();
    }
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: { content: true, format: true, type: true },
    });
    if (!report?.content) throw new NotFoundException();
    const ext = report.format === "CSV" ? "csv" : "pdf";
    const contentType =
      report.format === "CSV" ? "text/csv; charset=utf-8" : "application/pdf";
    return {
      data: Buffer.from(report.content),
      contentType,
      filename: `${report.type.toLowerCase()}.${ext}`,
    };
  }

  private hmac(payload: string): string {
    return createHmac("sha256", this.secret).update(payload).digest("hex");
  }
  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
