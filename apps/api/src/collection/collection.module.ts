import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { WhatsAppModule } from "../integrations/whatsapp/whatsapp.module";
import {
  COLLECTION_RULER_QUEUE,
  CollectionRulerProcessor,
  CollectionRulerScheduler,
} from "./collection-ruler";
import { CollectionService } from "./collection.service";

/**
 * Régua de cobrança (S22): cron diário (`collection-ruler`) → `CollectionService`
 * dispara lembretes escalonados por WhatsApp (reusa `WhatsAppService` do WhatsAppModule),
 * idempotente por (parcela, etapa) e respeitando opt-out.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: COLLECTION_RULER_QUEUE }),
    WhatsAppModule,
  ],
  providers: [
    CollectionService,
    CollectionRulerScheduler,
    CollectionRulerProcessor,
  ],
})
export class CollectionModule {}
