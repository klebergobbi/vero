import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ReportController } from "./report.controller";
import { REPORT_BUILDER_DLQ, REPORT_BUILDER_QUEUE } from "./report.constants";
import { ReportBuilderProcessor } from "./report-builder";
import { ReportService } from "./report.service";

/**
 * Engine de relatórios (S43): catálogo exportável (faturamento, faltas/
 * desmarcações) gerado em background na fila `report-builder` (retry/backoff/DLQ),
 * servido por URL assinada. Tenant-scoped.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: REPORT_BUILDER_QUEUE }),
    BullModule.registerQueue({ name: REPORT_BUILDER_DLQ }),
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportBuilderProcessor],
})
export class ReportModule {}
