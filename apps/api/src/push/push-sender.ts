import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "./push.service";

/** Fila de envio de push (CLAUDE.md §7). */
export const PUSH_SENDER_QUEUE = "push-sender";
/** Dead-letter: jobs que esgotaram os retries. */
export const PUSH_SENDER_DLQ = "push-sender-dlq";

/** Destinatário: paciente OU usuário de equipe (exatamente um). */
export type NotificationRecipient =
  | { tenantId: string; patientId: string }
  | { tenantId: string; userId: string };

export interface NotifyInput {
  recipient: NotificationRecipient;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushJobData {
  notificationId: string;
}

/** Produtor: persiste a Notification (histórico) e enfileira o envio. */
@Injectable()
export class PushSender {
  constructor(
    @InjectQueue(PUSH_SENDER_QUEUE) private readonly queue: Queue<PushJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async notify(input: NotifyInput): Promise<{ notificationId: string }> {
    const owner =
      "patientId" in input.recipient
        ? { patientId: input.recipient.patientId }
        : { userId: input.recipient.userId };

    const notif = await this.prisma.notification.create({
      data: {
        tenantId: input.recipient.tenantId,
        ...owner,
        type: input.type,
        title: input.title,
        body: input.body,
        ...(input.data ? { data: input.data as Prisma.InputJsonValue } : {}),
        status: "PENDING",
      },
      select: { id: true },
    });

    // jobId determinístico → idempotência (reprocesso do mesmo envio não duplica).
    await this.queue.add(
      "send",
      { notificationId: notif.id },
      { jobId: `push-${notif.id}` },
    );
    return { notificationId: notif.id };
  }
}

/**
 * Worker: envia o push de uma Notification. IDEMPOTENTE (já SENT → no-op).
 * Carrega os DeviceToken do destinatário RESPEITANDO `optedOut`; sem token → SKIPPED.
 * Tokens inválidos (DeviceNotRegistered) são removidos. Falha de transporte lança →
 * retry/backoff (defaultJobOptions) → DLQ ao esgotar (§4 fail-closed + observabilidade).
 */
@Processor(PUSH_SENDER_QUEUE)
export class PushSenderProcessor extends WorkerHost {
  private readonly logger = new Logger(PushSenderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    @InjectQueue(PUSH_SENDER_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<PushJobData>): Promise<{ outcome: string }> {
    const notif = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
    });
    if (!notif) return { outcome: "not-found" };
    if (notif.status === "SENT") return { outcome: "already-sent" };
    if (!notif.patientId && !notif.userId) {
      await this.markFailed(notif.id, "destinatário inválido");
      return { outcome: "invalid-recipient" };
    }

    const where: Prisma.DeviceTokenWhereInput = notif.patientId
      ? {
          tenantId: notif.tenantId,
          patientId: notif.patientId,
          optedOut: false,
        }
      : { tenantId: notif.tenantId, userId: notif.userId!, optedOut: false };
    const tokens = await this.prisma.deviceToken.findMany({
      where,
      select: { token: true },
    });

    if (tokens.length === 0) {
      await this.prisma.notification.update({
        where: { id: notif.id },
        data: { status: "SKIPPED" },
      });
      return { outcome: "no-tokens" };
    }

    const data = (notif.data ?? {}) as Record<string, unknown>;
    const messages = tokens.map((t) => ({
      to: t.token,
      title: notif.title,
      body: notif.body,
      data,
    }));
    const tickets = await this.push.send(messages); // lança em falha de transporte

    // Remove tokens que o Expo reportou como não registrados.
    const dead = tickets
      .map((tk, i) =>
        tk.status === "error" && tk.details?.error === "DeviceNotRegistered"
          ? messages[i]!.to
          : null,
      )
      .filter((t): t is string => t !== null);
    if (dead.length > 0) {
      await this.prisma.deviceToken.deleteMany({
        where: { token: { in: dead } },
      });
    }

    const anyOk = tickets.some((tk) => tk.status === "ok");
    await this.prisma.notification.update({
      where: { id: notif.id },
      data: anyOk
        ? { status: "SENT", sentAt: new Date() }
        : { status: "FAILED", error: tickets[0]?.message ?? "nenhum envio OK" },
    });
    this.logger.log(
      `Push ${notif.id}: ${anyOk ? "SENT" : "FAILED"} (${tokens.length} token(s), ${dead.length} removido(s))`,
    );
    return { outcome: anyOk ? "sent" : "failed" };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<PushJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;
    await this.dlq.add(
      "dead-letter",
      { ...job.data, error: err.message, originalJobId: job.id },
      { removeOnComplete: false, removeOnFail: false },
    );
    await this.markFailed(job.data.notificationId, err.message);
    this.logger.error(
      `Push job ${job.id} esgotou ${maxAttempts} tentativas → DLQ: ${err.message}`,
    );
  }

  private async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.notification
      .update({ where: { id }, data: { status: "FAILED", error } })
      .catch(() => undefined);
  }
}
