import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AsaasService } from "../integrations/asaas/asaas.service";
import { AsaasWebhookController } from "./asaas.webhook.controller";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import {
  PAYMENT_RECONCILER_DLQ,
  PAYMENT_RECONCILER_QUEUE,
  PaymentReconciler,
  PaymentReconcilerProcessor,
} from "./payment-reconciler";
import { ReconcileService } from "./reconcile.service";

/**
 * Cobranças (S19) + baixa automática (S20). A fila `payment-reconciler` processa
 * os webhooks do Asaas de forma idempotente (não dá baixa dupla).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: PAYMENT_RECONCILER_QUEUE }),
    BullModule.registerQueue({ name: PAYMENT_RECONCILER_DLQ }),
  ],
  controllers: [BillingController, AsaasWebhookController],
  providers: [
    BillingService,
    AsaasService,
    ReconcileService,
    PaymentReconciler,
    PaymentReconcilerProcessor,
  ],
})
export class BillingModule {}
