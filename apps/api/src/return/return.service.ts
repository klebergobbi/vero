import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { WhatsAppService } from "../integrations/whatsapp/whatsapp.service";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReturnRunResult {
  triggered: number;
  sent: number;
  failed: number;
}

/**
 * Alerta de retorno (§6/S33): agenda um lembrete para o paciente voltar (ao fim da
 * consulta) e, no prazo, dispara a tarefa de reagendamento + mensagem por WhatsApp.
 * Tenant-scoped (anti-IDOR). O cron diário (`return-alert-scheduler`) chama
 * `runDueAlerts`: SCHEDULED→TRIGGERED é IDEMPOTENTE (updateMany guarded) e RESPEITA
 * opt-out (filtra `messagingOptOut`).
 */
@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Agenda um alerta de retorno (dueDate explícito OU agora + intervalDays). */
  async create(
    tenantId: string,
    input: {
      patientId: string;
      appointmentId?: string;
      dueDate?: string;
      intervalDays?: number;
      reason?: string;
    },
  ) {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: input.patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    scope.ensureOwned(patient); // 403 anti-IDOR

    const due = this.resolveDueDate(input.dueDate, input.intervalDays);
    return this.prisma.returnAlert.create({
      data: {
        tenantId,
        patientId: input.patientId,
        ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
        dueDate: due,
        ...(input.reason ? { reason: input.reason } : {}),
      },
      select: this.summarySelect(),
    });
  }

  async list(tenantId: string, status?: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.returnAlert.findMany({
      where: scope.where<Prisma.ReturnAlertWhereInput>(
        status
          ? {
              status: status as NonNullable<
                Prisma.ReturnAlertWhereInput["status"]
              >,
            }
          : {},
      ),
      orderBy: { dueDate: "asc" },
      select: this.summarySelect(),
    });
  }

  /** Marca o alerta como reagendado (DONE) ou cancelado (CANCELLED). */
  async setStatus(tenantId: string, id: string, status: "DONE" | "CANCELLED") {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.returnAlert.findFirst({
      where: scope.where<Prisma.ReturnAlertWhereInput>({ id }),
      select: { id: true },
    });
    scope.ensureOwned(found); // 403 anti-IDOR
    return this.prisma.returnAlert.update({
      where: { id },
      data: { status },
      select: this.summarySelect(),
    });
  }

  /** Cron: dispara os alertas vencidos (SCHEDULED, dueDate <= agora). */
  async runDueAlerts(now: Date = new Date()): Promise<ReturnRunResult> {
    const due = await this.prisma.returnAlert.findMany({
      where: {
        status: "SCHEDULED",
        dueDate: { lte: now },
        // opt-out: paciente que recusou mensagens automáticas é excluído.
        patient: { messagingOptOut: false, deletedAt: null },
      },
      select: {
        id: true,
        reason: true,
        patient: { select: { name: true, phone: true } },
      },
    });
    const result: ReturnRunResult = { triggered: 0, sent: 0, failed: 0 };

    for (const alert of due) {
      // Idempotência: só dispara se ainda SCHEDULED (guarda anti-corrida).
      const upd = await this.prisma.returnAlert.updateMany({
        where: { id: alert.id, status: "SCHEDULED" },
        data: { status: "TRIGGERED", triggeredAt: now },
      });
      if (upd.count === 0) continue;
      result.triggered++;

      const text =
        `Olá, ${alert.patient.name}! Está na hora do seu retorno` +
        `${alert.reason ? ` (${alert.reason})` : ""}. ` +
        `Entre em contato para reagendar sua consulta.`;
      try {
        await this.whatsapp.sendText(alert.patient.phone, text);
        result.sent++;
      } catch {
        result.failed++;
        this.logger.warn(
          `Alerta de retorno ${alert.id}: falha no envio (já marcado TRIGGERED).`,
        );
      }
    }
    this.logger.log(
      `Retornos: ${result.triggered} disparados, ${result.sent} enviados, ${result.failed} falhas.`,
    );
    return result;
  }

  // --- internos ---

  private resolveDueDate(dueDate?: string, intervalDays?: number): Date {
    if (dueDate) {
      const d = new Date(dueDate);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException("dueDate inválido.");
      }
      return d;
    }
    if (intervalDays && intervalDays > 0) {
      return new Date(Date.now() + intervalDays * DAY_MS);
    }
    throw new BadRequestException("Informe dueDate ou intervalDays.");
  }

  private summarySelect() {
    return {
      id: true,
      patientId: true,
      appointmentId: true,
      dueDate: true,
      reason: true,
      status: true,
      triggeredAt: true,
      createdAt: true,
    } satisfies Prisma.ReturnAlertSelect;
  }
}
