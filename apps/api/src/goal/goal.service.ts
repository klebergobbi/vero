import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const GOAL_SELECT = {
  id: true,
  professionalId: true,
  metric: true,
  targetValue: true,
  periodStart: true,
  periodEnd: true,
  professional: { select: { name: true } },
} satisfies Prisma.GoalSelect;

type GoalRow = Prisma.GoalGetPayload<{ select: typeof GOAL_SELECT }>;

/**
 * Metas (§6/S41): alvo por clínica/profissional num período. O "realizado" é
 * calculado dos dados — REVENUE soma os pagamentos (S20) e APPOINTMENTS conta as
 * consultas (não canceladas) do período (filtrando por profissional quando a meta
 * é de um profissional). Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class GoalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    input: {
      professionalId?: string;
      metric: string;
      targetValue: number;
      periodStart: string;
      periodEnd: string;
    },
  ) {
    const scope = new TenantScope(tenantId);
    if (input.professionalId) {
      await this.assertProfessional(scope, input.professionalId);
    }
    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);
    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException("Período inválido (início ≥ fim).");
    }
    return this.prisma.goal.create({
      data: {
        tenantId,
        professionalId: input.professionalId ?? null,
        metric: input.metric as Prisma.GoalCreateInput["metric"],
        targetValue: input.targetValue,
        periodStart: start,
        periodEnd: end,
      },
      select: GOAL_SELECT,
    });
  }

  /** Lista as metas com o progresso (meta vs realizado) calculado. */
  async listWithProgress(tenantId: string) {
    const scope = new TenantScope(tenantId);
    const goals = await this.prisma.goal.findMany({
      where: scope.where<Prisma.GoalWhereInput>({}),
      orderBy: { periodEnd: "desc" },
      select: GOAL_SELECT,
    });
    return Promise.all(goals.map((g) => this.withProgress(tenantId, g)));
  }

  async remove(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.goal.findFirst({
      where: scope.where<Prisma.GoalWhereInput>({ id }),
      select: { id: true },
    });
    scope.ensureOwned(found); // 403 anti-IDOR
    await this.prisma.goal.delete({ where: { id } });
    return { id };
  }

  // --- internos ---

  private async withProgress(tenantId: string, goal: GoalRow) {
    const realized = await this.computeRealized(tenantId, goal);
    const percent =
      goal.targetValue > 0
        ? Math.round((realized / goal.targetValue) * 100)
        : 0;
    return { ...goal, realized, percent };
  }

  private async computeRealized(
    tenantId: string,
    goal: GoalRow,
  ): Promise<number> {
    const range = { gte: goal.periodStart, lte: goal.periodEnd };
    if (goal.metric === "REVENUE") {
      const agg = await this.prisma.payment.aggregate({
        where: { tenantId, paidAt: range },
        _sum: { amountCents: true },
      });
      return agg._sum.amountCents ?? 0;
    }
    // APPOINTMENTS: consultas não canceladas no período.
    return this.prisma.appointment.count({
      where: {
        tenantId,
        startsAt: range,
        status: { not: "CANCELLED" },
        deletedAt: null,
        ...(goal.professionalId ? { professionalId: goal.professionalId } : {}),
      },
    });
  }

  private async assertProfessional(scope: TenantScope, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: scope.where<Prisma.UserWhereInput>({
        id: userId,
        isActive: true,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!user) throw new BadRequestException("Profissional inválido.");
  }
}
