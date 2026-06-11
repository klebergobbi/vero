import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { DeviceController } from "./device.controller";
import { DeviceService } from "./device.service";
import {
  PUSH_SENDER_DLQ,
  PUSH_SENDER_QUEUE,
  PushSender,
  PushSenderProcessor,
} from "./push-sender";
import { PushService } from "./push.service";

/**
 * Push (S13). S13a: registro de device tokens. S13b: motor de envio —
 * `PushService` (proxy Expo) + fila `push-sender` (idempotente/backoff/DLQ) que
 * lê os DeviceToken do destinatário respeitando opt-out. `PushSender` é exportado
 * p/ outros módulos dispararem notificações (lembretes, confirmação, etc.).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: PUSH_SENDER_QUEUE }),
    BullModule.registerQueue({ name: PUSH_SENDER_DLQ }),
  ],
  controllers: [DeviceController],
  providers: [DeviceService, PushService, PushSender, PushSenderProcessor],
  exports: [DeviceService, PushSender, PushService],
})
export class PushModule {}
