import { Module } from "@nestjs/common";
import { CryptoService } from "./crypto.service";
import { RecordController } from "./record.controller";
import { RecordService } from "./record.service";

/**
 * Prontuário (S26): registro clínico com conteúdo/anexos cifrados em repouso
 * (CryptoService) e acesso auditado (AuditService é @Global). Anexos por URL
 * assinada de expiração curta (produção: DO Spaces).
 */
@Module({
  controllers: [RecordController],
  providers: [RecordService, CryptoService],
})
export class RecordModule {}
