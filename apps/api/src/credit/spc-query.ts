import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { SpcService } from "../integrations/spc/spc.service";
import { PrismaService } from "../prisma/prisma.service";

/** Fila de consulta/inclusão no bureau de crédito (§S25). */
export const SPC_QUERY_QUEUE = "spc-query";
export const SPC_QUERY_DLQ = "spc-query-dlq";

export interface SpcJobData {
  creditCheckId: string;
}

/**
 * Worker: processa a consulta/inclusão no SPC. IDEMPOTENTE (já DONE → no-op).
 * Falha (bureau instável) lança → retry/backoff → DLQ ao esgotar, com o motivo
 * persistido na CreditCheck (§4 fail-closed + observabilidade).
 */
@Processor(SPC_QUERY_QUEUE)
export class SpcQueryProcessor extends WorkerHost {
  private readonly logger = new Logger(SpcQueryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spc: SpcService,
    @InjectQueue(SPC_QUERY_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<SpcJobData>): Promise<{ outcome: string }> {
    const check = await this.prisma.creditCheck.findUnique({
      where: { id: job.data.creditCheckId },
      include: { patient: { select: { cpf: true, name: true } } },
    });
    if (!check) return { outcome: "not-found" };
    if (check.status === "DONE") return { outcome: "already-done" };
    if (!check.patient.cpf) {
      await this.markFailed(check.id, "Paciente sem CPF");
      return { outcome: "no-cpf" };
    }

    if (check.kind === "QUERY") {
      const res = await this.spc.query(check.patient.cpf);
      await this.prisma.creditCheck.update({
        where: { id: check.id },
        data: {
          status: "DONE",
          score: res.score,
          externalId: res.externalId,
          error: null,
        },
      });
    } else {
      const res = await this.spc.include({
        cpf: check.patient.cpf,
        amountCents: check.amountCents ?? 0,
        description: `Inadimplência - ${check.patient.name}`,
      });
      await this.prisma.creditCheck.update({
        where: { id: check.id },
        data: { status: "DONE", externalId: res.externalId, error: null },
      });
    }
    this.logger.log(`SPC ${check.kind}: creditCheck ${check.id} DONE`);
    return { outcome: "done" };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<SpcJobData>, err: Error): Promise<void> {
    await this.prisma.creditCheck
      .update({
        where: { id: job.data.creditCheckId },
        data: { error: err.message },
      })
      .catch(() => undefined);

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;

    await this.dlq.add(
      "dead-letter",
      { ...job.data, error: err.message, originalJobId: job.id },
      { removeOnComplete: false, removeOnFail: false },
    );
    await this.markFailed(job.data.creditCheckId, err.message);
    this.logger.error(
      `SPC job ${job.id} esgotou ${maxAttempts} tentativas → DLQ: ${err.message}`,
    );
  }

  private async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.creditCheck
      .update({ where: { id }, data: { status: "FAILED", error } })
      .catch(() => undefined);
  }
}
