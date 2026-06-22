import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { SpcService } from "../integrations/spc/spc.service";
import { CreditController } from "./credit.controller";
import { CreditService } from "./credit.service";
import { SPC_QUERY_DLQ, SPC_QUERY_QUEUE, SpcQueryProcessor } from "./spc-query";

/**
 * Crédito SPC/Serasa (S25): consulta de score e inclusão de inadimplente via
 * `SpcService` (proxy) numa fila `spc-query` (retry/backoff/DLQ). Consentimento
 * exigido e toda operação auditada (AuditService é @Global).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: SPC_QUERY_QUEUE }),
    BullModule.registerQueue({ name: SPC_QUERY_DLQ }),
  ],
  controllers: [CreditController],
  providers: [CreditService, SpcService, SpcQueryProcessor],
})
export class CreditModule {}
