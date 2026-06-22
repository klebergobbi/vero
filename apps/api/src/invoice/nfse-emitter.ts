import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { NfseService } from "../integrations/nfse/nfse.service";
import { PrismaService } from "../prisma/prisma.service";

/** Fila de emissão de NFS-e (§S23). */
export const NFSE_EMITTER_QUEUE = "nfse-emitter";
export const NFSE_EMITTER_DLQ = "nfse-emitter-dlq";

export interface NfseJobData {
  invoiceId: string;
}

/**
 * Worker: emite a NFS-e de uma Invoice no integrador. IDEMPOTENTE (já ISSUED →
 * no-op). Falha (prefeitura/integrador instável) lança → retry/backoff
 * (defaultJobOptions) → DLQ ao esgotar, com o motivo persistido na Invoice (§4).
 */
@Processor(NFSE_EMITTER_QUEUE)
export class NfseEmitterProcessor extends WorkerHost {
  private readonly logger = new Logger(NfseEmitterProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nfse: NfseService,
    @InjectQueue(NFSE_EMITTER_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<NfseJobData>): Promise<{ outcome: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: job.data.invoiceId },
      include: {
        payment: {
          select: {
            charge: {
              select: { patient: { select: { name: true, cpf: true } } },
            },
          },
        },
      },
    });
    if (!invoice) return { outcome: "not-found" };
    if (invoice.status === "ISSUED") return { outcome: "already-issued" };

    const patient = invoice.payment.charge.patient;
    const result = await this.nfse.emit({
      amountCents: invoice.amountCents,
      description: "NFS-e referente a serviços odontológicos",
      customerName: patient.name,
      ...(patient.cpf ? { customerCpf: patient.cpf } : {}),
      externalReference: invoice.id,
    }); // lança em falha → onFailed (retry/DLQ)

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "ISSUED",
        externalId: result.externalId,
        number: result.number ?? null,
        pdfUrl: result.pdfUrl ?? null,
        error: null,
      },
    });
    this.logger.log(
      `NFS-e emitida: invoice ${invoice.id} (${result.externalId})`,
    );
    return { outcome: "issued" };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<NfseJobData>, err: Error): Promise<void> {
    // registra o motivo na Invoice em toda tentativa (observabilidade).
    await this.prisma.invoice
      .update({
        where: { id: job.data.invoiceId },
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
    await this.prisma.invoice
      .update({
        where: { id: job.data.invoiceId },
        data: { status: "FAILED", error: err.message },
      })
      .catch(() => undefined);
    this.logger.error(
      `NFS-e job ${job.id} esgotou ${maxAttempts} tentativas → DLQ: ${err.message}`,
    );
  }
}
