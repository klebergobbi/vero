import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Plano de tratamento + execução (§6/S30). Converte um orçamento APROVADO num
 * plano executável por sessão: cada item do orçamento vira um TreatmentItem com
 * `quantity` sessões; executar registra um ExecutionLog (data + profissional) e
 * incrementa `doneCount` até concluir. Tudo tenant-scoped (anti-IDOR).
 */
@Injectable()
export class TreatmentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Gera o plano a partir de um orçamento APROVADO (1 por orçamento). */
  async generateFromBudget(tenantId: string, budgetId: string) {
    const scope = new TenantScope(tenantId);
    const budgetRow = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({
        id: budgetId,
        deletedAt: null,
      }),
      select: {
        id: true,
        patientId: true,
        status: true,
        treatmentPlan: { select: { id: true } },
        items: {
          select: { procedureId: true, description: true, quantity: true },
        },
      },
    });
    const budget = scope.ensureOwned(budgetRow); // 403 anti-IDOR

    if (budget.status !== "APPROVED") {
      throw new BadRequestException(
        "Só é possível gerar plano de orçamento aprovado.",
      );
    }
    if (budget.treatmentPlan) {
      throw new ConflictException("Este orçamento já tem um plano.");
    }

    const plan = await this.prisma.treatmentPlan.create({
      data: {
        tenantId,
        patientId: budget.patientId,
        budgetId: budget.id,
        items: {
          create: budget.items.map((it) => ({
            tenantId,
            procedureId: it.procedureId,
            description: it.description,
            quantity: it.quantity,
          })),
        },
      },
      select: { id: true },
    });
    return this.getPlan(tenantId, plan.id);
  }

  async listPlans(tenantId: string, patientId?: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.treatmentPlan.findMany({
      where: scope.where<Prisma.TreatmentPlanWhereInput>(
        patientId ? { patientId } : {},
      ),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientId: true,
        status: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
  }

  async getPlan(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: scope.where<Prisma.TreatmentPlanWhereInput>({ id }),
      select: {
        id: true,
        patientId: true,
        budgetId: true,
        status: true,
        createdAt: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            description: true,
            quantity: true,
            doneCount: true,
            status: true,
            executions: {
              orderBy: { performedAt: "desc" },
              select: {
                id: true,
                performedById: true,
                performedAt: true,
                notes: true,
              },
            },
          },
        },
      },
    });
    return scope.ensureOwned(plan); // 403 anti-IDOR
  }

  /** Registra a execução de uma sessão de um item (data + profissional). */
  async executeItem(
    tenantId: string,
    itemId: string,
    performedById: string,
    input: { notes?: string; performedAt?: string },
  ) {
    const scope = new TenantScope(tenantId);
    const itemRow = await this.prisma.treatmentItem.findFirst({
      where: scope.where<Prisma.TreatmentItemWhereInput>({ id: itemId }),
      select: {
        id: true,
        planId: true,
        quantity: true,
        doneCount: true,
      },
    });
    const item = scope.ensureOwned(itemRow); // 403 anti-IDOR

    if (item.doneCount >= item.quantity) {
      throw new ConflictException("Item já concluído.");
    }

    const doneCount = item.doneCount + 1;
    const status = doneCount >= item.quantity ? "DONE" : "IN_PROGRESS";

    await this.prisma.$transaction(async (tx) => {
      await tx.executionLog.create({
        data: {
          tenantId,
          itemId: item.id,
          performedById,
          ...(input.performedAt
            ? { performedAt: new Date(input.performedAt) }
            : {}),
          ...(input.notes ? { notes: input.notes } : {}),
        },
      });
      await tx.treatmentItem.update({
        where: { id: item.id },
        data: { doneCount, status },
      });
      // Plano concluído quando todos os itens estão DONE.
      const remaining = await tx.treatmentItem.count({
        where: { planId: item.planId, status: { not: "DONE" } },
      });
      if (remaining === 0) {
        await tx.treatmentPlan.update({
          where: { id: item.planId },
          data: { status: "COMPLETED" },
        });
      }
    });

    return this.getPlan(tenantId, item.planId);
  }
}
