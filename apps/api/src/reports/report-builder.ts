import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { REPORT_BUILDER_DLQ, REPORT_BUILDER_QUEUE } from "./report.constants";
import { ReportService } from "./report.service";

export interface ReportJobData {
  reportId: string;
}

/**
 * Worker: gera o relatório (consulta + CSV/PDF). IDEMPOTENTE (já READY → no-op).
 * Falha lança → retry/backoff (defaultJobOptions) → DLQ ao esgotar, com o motivo
 * persistido no Report (§4) e status FAILED.
 */
@Processor(REPORT_BUILDER_QUEUE)
export class ReportBuilderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportBuilderProcessor.name);

  constructor(
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
    @InjectQueue(REPORT_BUILDER_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<{ outcome: string }> {
    await this.reports.build(job.data.reportId); // lança em falha → onFailed
    return { outcome: "built" };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<ReportJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;

    await this.dlq.add(
      "dead-letter",
      { ...job.data, error: err.message, originalJobId: job.id },
      { removeOnComplete: false, removeOnFail: false },
    );
    await this.prisma.report
      .update({
        where: { id: job.data.reportId },
        data: { status: "FAILED", error: err.message },
      })
      .catch(() => undefined);
    this.logger.error(
      `Report job ${job.id} esgotou ${maxAttempts} tentativas → DLQ: ${err.message}`,
    );
  }
}
