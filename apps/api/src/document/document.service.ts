import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import PDFDocument from "pdfkit";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import type { Env } from "../config/env.validation";
import { EsignService } from "../integrations/esign/esign.service";
import { PrismaService } from "../prisma/prisma.service";

const SIGNED_URL_TTL_SECONDS = 300; // 5 min

const TYPE_LABEL: Record<string, string> = {
  ATTESTATION: "ATESTADO",
  PRESCRIPTION: "RECEITUÁRIO",
};

/**
 * Documentos clínicos assinados digitalmente (§6/S32): atestado/receituário. O
 * `body` é snapshot imutável; o `contentHash` (SHA-256, via EsignService da S18)
 * garante integridade. A assinatura é do PROFISSIONAL e acontece SERVER-SIDE — o
 * certificado nunca trafega/armazena no client (§5/S32). PDF gerado sob demanda e
 * servido por URL assinada de expiração curta (mesmo padrão do recibo S24).
 * Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class DocumentService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly esign: EsignService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get("JWT_SECRET", { infer: true });
  }

  /** Emite um documento DRAFT (corpo + hash de integridade). */
  async issue(
    tenantId: string,
    input: { patientId: string; type: string; title: string; content: string },
  ) {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: input.patientId,
        deletedAt: null,
      }),
      select: { id: true, name: true },
    });
    const owned = scope.ensureOwned(patient); // 403 anti-IDOR

    const body = this.buildBody(input.type, owned.name, input.content);
    const contentHash = this.esign.contentHash(body);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: input.patientId,
        type: input.type as Prisma.ClinicalDocumentCreateInput["type"],
        title: input.title,
        body,
        contentHash,
      },
      select: this.summarySelect(),
    });
    return doc;
  }

  async list(tenantId: string, patientId?: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.clinicalDocument.findMany({
      where: scope.where<Prisma.ClinicalDocumentWhereInput>(
        patientId ? { patientId } : {},
      ),
      orderBy: { createdAt: "desc" },
      select: this.summarySelect(),
    });
  }

  async get(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: scope.where<Prisma.ClinicalDocumentWhereInput>({ id }),
      select: { ...this.summarySelect(), body: true, contentHash: true },
    });
    return scope.ensureOwned(doc); // 403 anti-IDOR
  }

  /** Assina o documento (profissional, server-side — certificado nunca no client). */
  async sign(tenantId: string, id: string, signer: { userId: string }) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.clinicalDocument.findFirst({
      where: scope.where<Prisma.ClinicalDocumentWhereInput>({ id }),
      select: { id: true, status: true },
    });
    const doc = scope.ensureOwned(found); // 403 anti-IDOR
    if (doc.status !== "DRAFT") {
      throw new ConflictException("Documento já assinado ou cancelado.");
    }

    // Identidade do assinante vem do servidor (JWT → User), nunca do cliente.
    const user = await this.prisma.user.findFirst({
      where: scope.where<Prisma.UserWhereInput>({ id: signer.userId }),
      select: { name: true },
    });
    const signerName = user?.name ?? "Profissional";

    return this.prisma.clinicalDocument.update({
      where: { id: doc.id },
      data: {
        status: "SIGNED",
        signedById: signer.userId,
        signerName,
        signedAt: new Date(),
      },
      select: this.summarySelect(),
    });
  }

  /** Verifica a validade: integridade do corpo (hash) + assinatura presente. */
  async verify(tenantId: string, id: string) {
    const doc = await this.get(tenantId, id);
    const integrityOk = this.esign.contentHash(doc.body) === doc.contentHash;
    const signedOk = doc.status === "SIGNED" && doc.signedAt != null;
    return {
      id: doc.id,
      integrityOk,
      signedOk,
      valid: integrityOk && signedOk,
      signerName: doc.signerName,
      signedAt: doc.signedAt,
      contentHash: doc.contentHash,
    };
  }

  // --- PDF + URL assinada (mesmo padrão do recibo S24) ---

  signedUrl(documentId: string): { url: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const sig = this.hmac(`${documentId}.${exp}`);
    return {
      url: `/documents/file/${documentId}.${exp}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  verifyToken(token: string): string {
    const parts = token.split(".");
    if (parts.length !== 3) throw new NotFoundException();
    const [documentId, expStr, sig] = parts as [string, string, string];
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      throw new NotFoundException("Link expirado.");
    }
    if (!this.safeEqual(sig, this.hmac(`${documentId}.${exp}`))) {
      throw new NotFoundException();
    }
    return documentId;
  }

  async generatePdf(documentId: string): Promise<Buffer> {
    const doc = await this.prisma.clinicalDocument.findUnique({
      where: { id: documentId },
      select: {
        title: true,
        type: true,
        body: true,
        contentHash: true,
        signerName: true,
        signedAt: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
    });
    if (!doc) throw new NotFoundException();

    return new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      pdf.on("data", (c: Buffer) => chunks.push(c));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);

      pdf.fontSize(16).text(doc.tenant.name, { align: "center" });
      pdf.moveDown(0.5);
      pdf
        .fontSize(20)
        .text(TYPE_LABEL[doc.type] ?? doc.title, { align: "center" });
      pdf.moveDown(1.5);
      pdf.fontSize(12).text(doc.body, { align: "left" });
      pdf.moveDown(2);

      if (doc.signedAt && doc.signerName) {
        pdf
          .fontSize(11)
          .text(
            `Assinado digitalmente por ${doc.signerName} em ` +
              `${doc.signedAt.toLocaleString("pt-BR")}.`,
          )
          .moveDown(0.3)
          .fontSize(8)
          .fillColor("#666666")
          .text(`Hash de integridade (SHA-256): ${doc.contentHash}`);
      } else {
        pdf
          .fontSize(11)
          .fillColor("#999999")
          .text("DOCUMENTO NÃO ASSINADO — sem validade.");
      }
      pdf.end();
    });
  }

  // --- internos ---

  private buildBody(
    type: string,
    patientName: string,
    content: string,
  ): string {
    return [
      TYPE_LABEL[type] ?? "DOCUMENTO",
      "",
      `Paciente: ${patientName}`,
      "",
      content,
    ].join("\n");
  }

  private summarySelect() {
    return {
      id: true,
      patientId: true,
      type: true,
      title: true,
      status: true,
      signerName: true,
      signedAt: true,
      createdAt: true,
    } satisfies Prisma.ClinicalDocumentSelect;
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
