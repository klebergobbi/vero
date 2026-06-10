import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import {
  CONFIRMATION_SENDER_DLQ,
  CONFIRMATION_SENDER_QUEUE,
  ConfirmationSender,
  ConfirmationSenderProcessor,
} from "./confirmation-sender";
import { WhatsAppService } from "./whatsapp.service";

/**
 * Integração WhatsApp (Evolution) — proxy + fila de confirmação (S12a).
 * A conexão BullMQ e o defaultJobOptions (retry/backoff) vivem no
 * BullModule.forRootAsync (app.module). Aqui só registramos as filas.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: CONFIRMATION_SENDER_QUEUE }),
    BullModule.registerQueue({ name: CONFIRMATION_SENDER_DLQ }),
  ],
  providers: [WhatsAppService, ConfirmationSender, ConfirmationSenderProcessor],
  exports: [ConfirmationSender, WhatsAppService],
})
export class WhatsAppModule {}
