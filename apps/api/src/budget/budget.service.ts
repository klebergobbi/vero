import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AddBudgetItemDto,
  CreateBudgetDto,
  SetBudgetStatusDto,
} from "./dto/budget.dto";

/**
 * Orçamentos (§6/S17). TODO tenant-scoped (anti-IDOR §4). O `totalCents` é SEMPRE
 * recalculado no servidor a partir dos itens (CLAUDE.md: nunca confiar em total do
 * front). Itens guardam snapshot (description + unitPriceCents). Só orçamento OPEN
 * pode ser alterado; ao decidir (APPROVED/REJECTED) registra `decidedAt`.
 */
@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBudgetDto) {
    const scope = new TenantScope(tenantId);
    await this.assertPatient(scope, dto.patientId);
    if (dto.planId) await this.assertPlan(scope, dto.planId);
    return this.prisma.budget.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        planId: dto.planId ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  listBudgets(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.budget.findMany({
      where: scope.where<Prisma.BudgetWhereInput>({ deletedAt: null }),
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
  }

  async getBudget(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const budget = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({ id, deletedAt: null }),
      include: {
        patient: { select: { name: true } },
        items: { orderBy: { createdAt: "asc" } },
        contract: { select: { id: true, status: true } },
        charge: { select: { id: true, status: true } },
        treatmentPlan: { select: { id: true, status: true } },
      },
    });
    return scope.ensureOwned(budget);
  }

  async addItem(tenantId: string, budgetId: string, dto: AddBudgetItemDto) {
    const scope = new TenantScope(tenantId);
    const budget = await this.assertOpenBudget(scope, budgetId);
    const procedure = await this.assertProcedure(scope, dto.procedureId);

    const unitPriceCents = await this.resolvePrice(scope, dto, budget.planId);
    const quantity = dto.quantity ?? 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.budgetItem.create({
        data: {
          tenantId,
          budgetId,
          procedureId: dto.procedureId,
          description: procedure.name,
          quantity,
          unitPriceCents,
        },
      });
      await this.recomputeTotal(tx, budgetId);
    });
    return this.getBudget(tenantId, budgetId);
  }

  async removeItem(tenantId: string, budgetId: string, itemId: string) {
    const scope = new TenantScope(tenantId);
    await this.assertOpenBudget(scope, budgetId);
    // o item tem que ser deste orçamento (e tenant) — anti-IDOR.
    const item = await this.prisma.budgetItem.findFirst({
      where: scope.where<Prisma.BudgetItemWhereInput>({
        id: itemId,
        budgetId,
      }),
      select: { id: true },
    });
    scope.ensureOwned(item);

    await this.prisma.$transaction(async (tx) => {
      await tx.budgetItem.delete({ where: { id: itemId } });
      await this.recomputeTotal(tx, budgetId);
    });
    return this.getBudget(tenantId, budgetId);
  }

  async setStatus(tenantId: string, id: string, dto: SetBudgetStatusDto) {
    const scope = new TenantScope(tenantId);
    const budget = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({ id, deletedAt: null }),
      select: { id: true, status: true },
    });
    const owned = scope.ensureOwned(budget);
    if (owned.status !== "OPEN") {
      throw new ConflictException("Este orçamento já foi decidido.");
    }
    return this.prisma.budget.update({
      where: { id },
      data: { status: dto.status, decidedAt: new Date() },
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const scope = new TenantScope(tenantId);
    const budget = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({ id, deletedAt: null }),
      select: { id: true },
    });
    scope.ensureOwned(budget);
    await this.prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- internos ---

  /** Recalcula o total do orçamento (soma quantity*unitPriceCents) — server-side. */
  private async recomputeTotal(
    tx: Prisma.TransactionClient,
    budgetId: string,
  ): Promise<void> {
    const items = await tx.budgetItem.findMany({
      where: { budgetId },
      select: { quantity: true, unitPriceCents: true },
    });
    const totalCents = items.reduce(
      (sum, it) => sum + it.quantity * it.unitPriceCents,
      0,
    );
    await tx.budget.update({ where: { id: budgetId }, data: { totalCents } });
  }

  /** Preço unitário: explícito do DTO, ou do catálogo (PriceTable do convênio). */
  private async resolvePrice(
    scope: TenantScope,
    dto: AddBudgetItemDto,
    planId: string | null,
  ): Promise<number> {
    if (dto.unitPriceCents !== undefined) return dto.unitPriceCents;
    if (planId) {
      const price = await this.prisma.priceTable.findFirst({
        where: scope.where<Prisma.PriceTableWhereInput>({
          procedureId: dto.procedureId,
          planId,
          active: true,
        }),
        select: { priceCents: true },
      });
      if (price) return price.priceCents;
    }
    throw new BadRequestException(
      "Informe o preço do item ou cadastre-o no catálogo (convênio).",
    );
  }

  private async assertOpenBudget(scope: TenantScope, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({
        id: budgetId,
        deletedAt: null,
      }),
      select: { id: true, status: true, planId: true },
    });
    const owned = scope.ensureOwned(budget);
    if (owned.status !== "OPEN") {
      throw new ConflictException(
        "Orçamento já decidido — não pode ser alterado.",
      );
    }
    return owned;
  }

  private async assertPatient(scope: TenantScope, patientId: string) {
    const row = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!row) throw new BadRequestException("Paciente inválido");
  }

  private async assertPlan(scope: TenantScope, planId: string) {
    const row = await this.prisma.plan.findFirst({
      where: scope.where<Prisma.PlanWhereInput>({
        id: planId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!row) throw new BadRequestException("Convênio inválido");
  }

  private async assertProcedure(scope: TenantScope, procedureId: string) {
    const row = await this.prisma.procedure.findFirst({
      where: scope.where<Prisma.ProcedureWhereInput>({
        id: procedureId,
        deletedAt: null,
      }),
      select: { id: true, name: true },
    });
    if (!row) throw new BadRequestException("Procedimento inválido");
    return row;
  }
}
