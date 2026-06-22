import { createHash, timingSafeEqual } from "node:crypto";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/decorators/public.decorator";
import type { Env } from "../config/env.validation";
import { PaymentReconciler } from "./payment-reconciler";

/** Eventos do Asaas que representam pagamento recebido. */
const PAID_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];

interface AsaasWebhookBody {
  event?: string;
  payment?: { id?: string; value?: number; paymentDate?: string };
}

/**
 * Webhook do Asaas (S20). Rota PÚBLICA (sem JWT), protegida pelo segredo
 * compartilhado `ASAAS_WEBHOOK_SECRET` (header `asaas-access-token`), comparado em
 * tempo constante. Fail-closed: sem segredo → recusa. Enfileira a baixa (fila
 * idempotente) e responde 200 sempre nos casos de negócio (evita retries do Asaas).
 */
@Controller("integrations/asaas")
export class AsaasWebhookController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly reconciler: PaymentReconciler,
  ) {}

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers("asaas-access-token") token: string | undefined,
    @Body() body: AsaasWebhookBody,
  ): Promise<{ ok: true; outcome: string }> {
    this.assertSecret(token);

    const event = body?.event;
    const payment = body?.payment;
    if (!event || !payment?.id || !PAID_EVENTS.includes(event)) {
      return { ok: true, outcome: "ignored" };
    }

    await this.reconciler.enqueue({
      event,
      asaasPaymentId: payment.id,
      amountCents: Math.round((payment.value ?? 0) * 100),
      ...(payment.paymentDate ? { paidAtIso: payment.paymentDate } : {}),
    });
    return { ok: true, outcome: "enqueued" };
  }

  /** Valida o segredo em tempo constante. Fail-closed se não configurado. */
  private assertSecret(provided: string | undefined): void {
    const expected = this.config.get("ASAAS_WEBHOOK_SECRET", { infer: true });
    if (!expected) {
      throw new ServiceUnavailableException("Webhook Asaas não configurado.");
    }
    if (!provided || !this.safeEqual(provided, expected)) {
      throw new UnauthorizedException();
    }
  }

  private safeEqual(a: string, b: string): boolean {
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
