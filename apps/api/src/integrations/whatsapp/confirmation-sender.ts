import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { WhatsAppService } from "./whatsapp.service";

/** Fila de envio de confirmação por WhatsApp (CLAUDE.md §7). */
export const CONFIRMATION_SENDER_QUEUE = "confirmation-sender";
/** Dead-letter: jobs que esgotaram os retries caem aqui (não se perde mensagem). */
export const CONFIRMATION_SENDER_DLQ = "confirmation-sender-dlq";

/** Payload do job de envio. Sem segredos; só o necessário para montar a mensagem. */
export interface ConfirmationJobData {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  phone: string;
  text: string;
}

/** Produtor: agenda o envio da confirmação. */
@Injectable()
export class ConfirmationSender {
  private static readonly D1_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectQueue(CONFIRMATION_SENDER_QUEUE)
    private readonly queue: Queue<ConfirmationJobData>,
  ) {}

  /**
   * Agenda a confirmação para D-1 (24h antes do início). IDEMPOTENTE: o `jobId`
   * determinístico por agendamento faz o BullMQ ignorar um segundo enfileiramento
   * do mesmo agendamento (reprocesso não duplica — §4 / aceite S12).
   */
  async scheduleD1(data: ConfirmationJobData, startsAt: Date): Promise<void> {
    const delay = Math.max(
      0,
      startsAt.getTime() - ConfirmationSender.D1_MS - Date.now(),
    );
    await this.queue.add("send", data, {
      // jobId determinístico (sem ":", reservado pelo BullMQ) → dedup por agendamento.
      jobId: `confirm-${data.appointmentId}`,
      delay,
    });
  }
}

/**
 * Worker: consome a fila e envia via Evolution. Idempotente (jobId por
 * agendamento), com retry/backoff (configurado no defaultJobOptions do
 * BullModule.forRoot) e DLQ ao esgotar as tentativas (§4 — fail-closed +
 * observabilidade; mensagem nunca some silenciosamente).
 */
@Processor(CONFIRMATION_SENDER_QUEUE)
export class ConfirmationSenderProcessor extends WorkerHost {
  private readonly logger = new Logger(ConfirmationSenderProcessor.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    @InjectQueue(CONFIRMATION_SENDER_DLQ)
    private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<ConfirmationJobData>): Promise<{ messageId: string }> {
    const { phone, text } = job.data;
    const { id } = await this.whatsapp.sendText(phone, text);
    this.logger.log(
      `Confirmação enviada (job ${job.id}, appointment ${job.data.appointmentId})`,
    );
    return { messageId: id };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<ConfirmationJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return; // ainda há retries pela frente

    await this.dlq.add(
      "dead-letter",
      {
        ...job.data,
        error: err.message,
        originalJobId: job.id,
        failedAttempts: job.attemptsMade,
      },
      { removeOnComplete: false, removeOnFail: false },
    );
    this.logger.error(
      `Job ${job.id} esgotou ${maxAttempts} tentativas → DLQ: ${err.message}`,
    );
  }
}
