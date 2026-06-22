import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ReconcileInput {
  /** tipo do evento Asaas (ex.: PAYMENT_RECEIVED). */
  event: string;
  /** id do pagamento no Asaas (casado com Installment.asaasPaymentId). */
  asaasPaymentId: string;
  /** valor recebido em centavos. */
  amountCents: number;
  /** instante do pagamento (ISO). */
  paidAtIso?: string;
}

export type ReconcileOutcome =
  | "reconciled"
  | "already-reconciled"
  | "installment-not-found";

/**
 * Baixa automática (§S20): casa um pagamento recebido do Asaas com a parcela e dá
 * baixa. IDEMPOTENTE em 2 camadas — `Payment.installmentId` é único (reprocesso →
 * P2002 → no-op) e `Reconciliation.eventKey` único por tenant. Recalcula o status
 * da Charge (PARTIAL/PAID) após a baixa. Tudo numa transação.
 */
@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async reconcile(input: ReconcileInput): Promise<ReconcileOutcome> {
    // Resolve a parcela pelo id do pagamento no Asaas (não vem tenant no webhook;
    // o asaasPaymentId é a chave de casamento — único na conta Asaas).
    const installment = await this.prisma.installment.findFirst({
      where: { asaasPaymentId: input.asaasPaymentId },
      select: { id: true, tenantId: true, chargeId: true, status: true },
    });
    if (!installment) return "installment-not-found";
    if (installment.status === "PAID") return "already-reconciled"; // idempotência por estado

    const eventKey = `${input.event}:${input.asaasPaymentId}`;
    const paidAt = input.paidAtIso ? new Date(input.paidAtIso) : new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            tenantId: installment.tenantId,
            installmentId: installment.id,
            chargeId: installment.chargeId,
            amountCents: input.amountCents,
            asaasPaymentId: input.asaasPaymentId,
            paidAt,
          },
          select: { id: true },
        });
        await tx.reconciliation.create({
          data: {
            tenantId: installment.tenantId,
            paymentId: payment.id,
            eventKey,
          },
        });
        await tx.installment.update({
          where: { id: installment.id },
          data: { status: "PAID", paidAt },
        });
        await this.refreshChargeStatus(tx, installment.chargeId);
      });
    } catch (err) {
      // P2002: já existe Payment p/ esta parcela (ou eventKey) → baixa já feita.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return "already-reconciled";
      }
      throw err;
    }

    this.logger.log(`Baixa: parcela ${installment.id} (${eventKey})`);
    return "reconciled";
  }

  /** PAID se todas as parcelas pagas; senão PARTIAL (alguma paga) ou PENDING. */
  private async refreshChargeStatus(
    tx: Prisma.TransactionClient,
    chargeId: string,
  ): Promise<void> {
    const items = await tx.installment.findMany({
      where: { chargeId },
      select: { status: true },
    });
    const paid = items.filter((i) => i.status === "PAID").length;
    const status =
      paid === 0 ? "PENDING" : paid === items.length ? "PAID" : "PARTIAL";
    await tx.charge.update({ where: { id: chargeId }, data: { status } });
  }
}
