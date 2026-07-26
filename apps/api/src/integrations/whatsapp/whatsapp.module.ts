import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AiModule } from "../../ai/ai.module";
import { MeModule } from "../../me/me.module";
import {
  CONFIRMATION_SENDER_DLQ,
  CONFIRMATION_SENDER_QUEUE,
  ConfirmationSender,
  ConfirmationSenderProcessor,
} from "./confirmation-sender";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";
import { WhatsAppService } from "./whatsapp.service";

/**
 * Integração WhatsApp (Evolution): proxy + fila de envio (S12a) e webhook de
 * resposta do paciente (S12b). A conexão BullMQ e o defaultJobOptions vivem no
 * BullModule.forRootAsync (app.module). O webhook reusa a confirmação idempotente
 * da S11 via MeService (importado de MeModule) e, quando a mensagem não é uma
 * confirmação simples, delega ao agente de IA (S50, via AiModule).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: CONFIRMATION_SENDER_QUEUE }),
    BullModule.registerQueue({ name: CONFIRMATION_SENDER_DLQ }),
    MeModule,
    AiModule,
  ],
  controllers: [WhatsAppWebhookController],
  providers: [
    WhatsAppService,
    ConfirmationSender,
    ConfirmationSenderProcessor,
    WhatsAppWebhookService,
  ],
  exports: [ConfirmationSender, WhatsAppService],
})
export class WhatsAppModule {}
