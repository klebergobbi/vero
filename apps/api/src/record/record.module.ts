import { Module } from "@nestjs/common";
import { CryptoService } from "./crypto.service";
import { ImageController } from "./image.controller";
import { ImageService } from "./image.service";
import { RecordController } from "./record.controller";
import { RecordService } from "./record.service";

/**
 * Prontuário (S26) + imagens intraorais (S36): registro clínico com conteúdo/anexos
 * cifrados em repouso (CryptoService) e acesso auditado (AuditService é @Global).
 * Anexos/imagens por URL assinada de expiração curta (produção: DO Spaces).
 */
@Module({
  controllers: [RecordController, ImageController],
  providers: [RecordService, CryptoService, ImageService],
})
export class RecordModule {}
