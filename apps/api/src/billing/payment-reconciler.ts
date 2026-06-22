import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { ReconcileService, type ReconcileInput } from "./reconcile.service";

/** Fila de baixa automática de pagamentos (§S20). */
export const PAYMENT_RECONCILER_QUEUE = "payment-reconciler";
export const PAYMENT_RECONCILER_DLQ = "payment-reconciler-dlq";

/** Produtor: enfileira um evento de pagamento do Asaas para baixa. */
@Injectable()
export class PaymentReconciler {
  constructor(
    @InjectQueue(PAYMENT_RECONCILER_QUEUE)
    private readonly queue: Queue<ReconcileInput>,
  ) {}

  async enqueue(input: ReconcileInput): Promise<void> {
    // jobId determinístico (event + paymentId) → dedup no nível da fila.
    await this.queue.add("reconcile", input, {
      jobId: `asaas-${input.event}-${input.asaasPaymentId}`,
    });
  }
}

/**
 * Worker: dá baixa na parcela (idempotente via ReconcileService). Falha →
 * retry/backoff (defaultJobOptions) → DLQ ao esgotar (§4 fail-closed + observ.).
 */
@Processor(PAYMENT_RECONCILER_QUEUE)
export class PaymentReconcilerProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReconcilerProcessor.name);

  constructor(
    private readonly reconcile: ReconcileService,
    @InjectQueue(PAYMENT_RECONCILER_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<ReconcileInput>): Promise<{ outcome: string }> {
    const outcome = await this.reconcile.reconcile(job.data);
    return { outcome };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<ReconcileInput>, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;
    await this.dlq.add(
      "dead-letter",
      { ...job.data, error: err.message, originalJobId: job.id },
      { removeOnComplete: false, removeOnFail: false },
    );
    this.logger.error(
      `Reconcile job ${job.id} esgotou ${maxAttempts} tentativas → DLQ: ${err.message}`,
    );
  }
}
