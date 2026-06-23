import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

/** Prioridade padrão por tipo (maior = mais urgente). */
const TYPE_PRIORITY: Record<string, number> = {
  RETURN: 10,
  REACTIVATION: 8,
  POST_SALE: 6,
  BIRTHDAY: 5,
  OTHER: 1,
};

/**
 * CRC — Central de Relacionamento (§6/S34): fila priorizada de contatos do dia.
 * As tarefas de RETORNO nascem dos `ReturnAlert` TRIGGERED (S33) via `sync`
 * (idempotente por `sourceAlertId @unique`); outras são criadas manualmente.
 * Tenant-scoped (anti-IDOR). Marcar-como-feito + atribuição a um profissional.
 */
@Injectable()
export class CrcService {
  private readonly logger = new Logger(CrcService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Cria uma tarefa manual (pós-venda/reativação/aniversário/outro). */
  async create(
    tenantId: string,
    input: {
      patientId: string;
      type: string;
      dueDate?: string;
      notes?: string;
      priority?: number;
      assignedToId?: string;
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

    if (input.assignedToId) {
      await this.assertUser(scope, input.assignedToId);
    }

    return this.prisma.cRCTask.create({
      data: {
        tenantId,
        patientId: input.patientId,
        type: input.type as Prisma.CRCTaskCreateInput["type"],
        priority: input.priority ?? TYPE_PRIORITY[input.type] ?? 0,
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
        ...(input.assignedToId ? { assignedToId: input.assignedToId } : {}),
      },
      select: this.taskSelect(),
    });
  }

  /** Importa os ReturnAlert TRIGGERED ainda sem tarefa → tarefas RETURN. */
  async syncReturnAlerts(tenantId: string) {
    const alerts = await this.prisma.returnAlert.findMany({
      where: { tenantId, status: "TRIGGERED", crcTask: { is: null } },
      select: { id: true, patientId: true, reason: true, dueDate: true },
    });

    let created = 0;
    for (const a of alerts) {
      try {
        await this.prisma.cRCTask.create({
          data: {
            tenantId,
            patientId: a.patientId,
            type: "RETURN",
            priority: TYPE_PRIORITY.RETURN,
            sourceAlertId: a.id,
            dueDate: a.dueDate,
            ...(a.reason ? { notes: a.reason } : {}),
          },
        });
        created++;
      } catch (err) {
        // Idempotência: corrida no unique sourceAlertId → ignora.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          continue;
        }
        throw err;
      }
    }
    this.logger.log(`CRC sync: ${created} tarefas de retorno criadas.`);
    return { created };
  }

  /** Lista priorizada (OPEN por padrão): prioridade desc, depois vencimento. */
  async list(tenantId: string, status = "OPEN") {
    const scope = new TenantScope(tenantId);
    return this.prisma.cRCTask.findMany({
      where: scope.where<Prisma.CRCTaskWhereInput>({
        status: status as Prisma.CRCTaskWhereInput["status"],
      }),
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      select: this.taskSelect(),
    });
  }

  /** Marca a tarefa como concluída. */
  async markDone(tenantId: string, id: string) {
    await this.assertTask(tenantId, id);
    return this.prisma.cRCTask.update({
      where: { id },
      data: { status: "DONE", doneAt: new Date() },
      select: this.taskSelect(),
    });
  }

  /** Atribui (ou remove a atribuição de) a tarefa a um profissional. */
  async assign(tenantId: string, id: string, userId: string | null) {
    const scope = new TenantScope(tenantId);
    await this.assertTask(tenantId, id);
    if (userId) await this.assertUser(scope, userId);
    return this.prisma.cRCTask.update({
      where: { id },
      data: { assignedToId: userId },
      select: this.taskSelect(),
    });
  }

  // --- internos ---

  private async assertTask(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const task = await this.prisma.cRCTask.findFirst({
      where: scope.where<Prisma.CRCTaskWhereInput>({ id }),
      select: { id: true },
    });
    return scope.ensureOwned(task); // 403 anti-IDOR
  }

  private async assertUser(scope: TenantScope, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: scope.where<Prisma.UserWhereInput>({
        id: userId,
        isActive: true,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException("Responsável inválido.");
    }
  }

  private taskSelect() {
    return {
      id: true,
      patientId: true,
      type: true,
      status: true,
      priority: true,
      dueDate: true,
      notes: true,
      assignedToId: true,
      doneAt: true,
      createdAt: true,
      patient: { select: { name: true, phone: true } },
      assignedTo: { select: { name: true } },
    } satisfies Prisma.CRCTaskSelect;
  }
}
