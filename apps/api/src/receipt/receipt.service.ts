import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import PDFDocument from "pdfkit";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import type { Env } from "../config/env.validation";
import { PrismaService } from "../prisma/prisma.service";

/** Validade da URL assinada do recibo (curta — §S24). */
const SIGNED_URL_TTL_SECONDS = 300; // 5 min

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Recibos (§6/S24): registra a emissão (número) e entrega o PDF por uma URL
 * ASSINADA de expiração curta (HMAC sobre `receiptId.exp` com o JWT_SECRET — o
 * mesmo conceito da presigned URL do DO Spaces; o upload p/ Spaces fica como troca
 * de produção). O PDF é gerado sob demanda (não persiste blob). Tenant-scoped.
 */
@Injectable()
export class ReceiptService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get("JWT_SECRET", { infer: true });
  }

  /** Emite (ou reaproveita) o recibo do pagamento e devolve a URL assinada. */
  async issue(tenantId: string, paymentId: string) {
    const scope = new TenantScope(tenantId);
    const payment = await this.prisma.payment.findFirst({
      where: scope.where<Prisma.PaymentWhereInput>({ id: paymentId }),
      select: { id: true, receipt: { select: { id: true } } },
    });
    const owned = scope.ensureOwned(payment);

    let receiptId = owned.receipt?.id;
    if (!receiptId) {
      const count = await this.prisma.receipt.count({ where: { tenantId } });
      const number = `REC-${String(count + 1).padStart(5, "0")}`;
      const created = await this.prisma.receipt.create({
        data: { tenantId, paymentId, number },
        select: { id: true },
      });
      receiptId = created.id;
    }
    return this.signedUrl(receiptId);
  }

  /** Monta a URL assinada (token = receiptId.exp.hmac). */
  signedUrl(receiptId: string): { url: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const sig = this.sign(`${receiptId}.${exp}`);
    const token = `${receiptId}.${exp}.${sig}`;
    return {
      url: `/receipts/file/${token}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  /** Valida o token (assinatura + expiração) e devolve o receiptId. */
  verifyToken(token: string): string {
    const parts = token.split(".");
    if (parts.length !== 3) throw new NotFoundException();
    const [receiptId, expStr, sig] = parts as [string, string, string];
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      throw new NotFoundException("Link expirado.");
    }
    const expected = this.sign(`${receiptId}.${exp}`);
    if (!this.safeEqual(sig, expected)) throw new NotFoundException();
    return receiptId;
  }

  /** Gera o PDF do recibo sob demanda. */
  async generatePdf(receiptId: string): Promise<Buffer> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
      select: {
        number: true,
        createdAt: true,
        tenant: { select: { name: true } },
        payment: {
          select: {
            amountCents: true,
            paidAt: true,
            charge: { select: { patient: { select: { name: true } } } },
          },
        },
      },
    });
    if (!receipt) throw new NotFoundException();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const p = receipt.payment;
      doc.fontSize(18).text(receipt.tenant.name, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(22).text("RECIBO", { align: "center" });
      doc.moveDown(1.5);
      doc
        .fontSize(12)
        .text(`Recibo nº: ${receipt.number}`)
        .moveDown(0.3)
        .text(`Recebemos de: ${p.charge.patient.name}`)
        .moveDown(0.3)
        .text(`Valor: ${brl(p.amountCents)}`)
        .moveDown(0.3)
        .text(`Pago em: ${p.paidAt.toLocaleDateString("pt-BR")}`)
        .moveDown(1.5)
        .text(
          "Referente a serviços odontológicos prestados. Este recibo comprova o " +
            "pagamento acima descrito.",
          { align: "justify" },
        )
        .moveDown(2)
        .text(`Emitido em ${receipt.createdAt.toLocaleDateString("pt-BR")}`, {
          align: "right",
        });
      doc.end();
    });
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
