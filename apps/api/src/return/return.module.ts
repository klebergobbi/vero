import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { WhatsAppModule } from "../integrations/whatsapp/whatsapp.module";
import {
  RETURN_ALERT_QUEUE,
  ReturnAlertProcessor,
  ReturnAlertScheduler,
} from "./return-alert-scheduler";
import { ReturnController } from "./return.controller";
import { ReturnService } from "./return.service";

/**
 * Alerta de retorno (S33): cron diário (`return-alert-scheduler`) →
 * `ReturnService.runDueAlerts` dispara os retornos vencidos por WhatsApp (reusa
 * `WhatsAppService`), idempotente (SCHEDULED→TRIGGERED) e respeitando opt-out.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: RETURN_ALERT_QUEUE }),
    WhatsAppModule,
  ],
  controllers: [ReturnController],
  providers: [ReturnService, ReturnAlertScheduler, ReturnAlertProcessor],
})
export class ReturnModule {}
