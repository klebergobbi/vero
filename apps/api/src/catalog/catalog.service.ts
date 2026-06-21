import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreatePlanDto,
  CreatePriceDto,
  CreateProcedureDto,
  UpdatePlanDto,
  UpdatePriceDto,
  UpdateProcedureDto,
} from "./dto/catalog.dto";

/**
 * Catálogo comercial (§6/S16): Procedure, Plan (convênio) e PriceTable (preço por
 * convênio). TODA query é tenant-scoped via TenantScope (anti-IDOR §4); `ensureOwned`
 * nega 403 para recurso de outro tenant. Procedure/Plan usam soft-delete.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Procedimentos ---

  createProcedure(tenantId: string, dto: CreateProcedureDto) {
    return this.prisma.procedure.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code ?? null,
        durationMinutes: dto.durationMinutes ?? null,
      },
    });
  }

  listProcedures(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.procedure.findMany({
      where: scope.where<Prisma.ProcedureWhereInput>({ deletedAt: null }),
      orderBy: { name: "asc" },
    });
  }

  async updateProcedure(tenantId: string, id: string, dto: UpdateProcedureDto) {
    await this.ensureProcedure(tenantId, id);
    const data: Prisma.ProcedureUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code ?? null;
    if (dto.durationMinutes !== undefined)
      data.durationMinutes = dto.durationMinutes ?? null;
    if (dto.active !== undefined) data.active = dto.active;
    return this.prisma.procedure.update({ where: { id }, data });
  }

  async removeProcedure(tenantId: string, id: string): Promise<void> {
    await this.ensureProcedure(tenantId, id);
    await this.prisma.procedure.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Convênios (Plan) ---

  createPlan(tenantId: string, dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: { tenantId, name: dto.name } });
  }

  listPlans(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.plan.findMany({
      where: scope.where<Prisma.PlanWhereInput>({ deletedAt: null }),
      orderBy: { name: "asc" },
    });
  }

  async updatePlan(tenantId: string, id: string, dto: UpdatePlanDto) {
    await this.ensurePlan(tenantId, id);
    const data: Prisma.PlanUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.active !== undefined) data.active = dto.active;
    return this.prisma.plan.update({ where: { id }, data });
  }

  async removePlan(tenantId: string, id: string): Promise<void> {
    await this.ensurePlan(tenantId, id);
    await this.prisma.plan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Preços (PriceTable) ---

  async createPrice(tenantId: string, dto: CreatePriceDto) {
    // Procedimento e convênio precisam ser DO MESMO tenant (anti-IDOR + integridade).
    await this.ensureProcedure(tenantId, dto.procedureId);
    await this.ensurePlan(tenantId, dto.planId);
    try {
      return await this.prisma.priceTable.create({
        data: {
          tenantId,
          procedureId: dto.procedureId,
          planId: dto.planId,
          priceCents: dto.priceCents,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new BadRequestException(
          "Já existe preço para esse procedimento neste convênio.",
        );
      }
      throw err;
    }
  }

  listPrices(tenantId: string, procedureId?: string) {
    const scope = new TenantScope(tenantId);
    const where = scope.where<Prisma.PriceTableWhereInput>({});
    if (procedureId) where.procedureId = procedureId;
    return this.prisma.priceTable.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        procedure: { select: { name: true } },
        plan: { select: { name: true } },
      },
    });
  }

  async updatePrice(tenantId: string, id: string, dto: UpdatePriceDto) {
    await this.ensurePrice(tenantId, id);
    const data: Prisma.PriceTableUncheckedUpdateInput = {};
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.active !== undefined) data.active = dto.active;
    return this.prisma.priceTable.update({ where: { id }, data });
  }

  async removePrice(tenantId: string, id: string): Promise<void> {
    await this.ensurePrice(tenantId, id);
    await this.prisma.priceTable.delete({ where: { id } });
  }

  // --- posse (anti-IDOR): 403 se não for do tenant ---

  private async ensureProcedure(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const row = await this.prisma.procedure.findFirst({
      where: scope.where<Prisma.ProcedureWhereInput>({ id, deletedAt: null }),
      select: { id: true },
    });
    return scope.ensureOwned(row);
  }

  private async ensurePlan(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const row = await this.prisma.plan.findFirst({
      where: scope.where<Prisma.PlanWhereInput>({ id, deletedAt: null }),
      select: { id: true },
    });
    return scope.ensureOwned(row);
  }

  private async ensurePrice(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const row = await this.prisma.priceTable.findFirst({
      where: scope.where<Prisma.PriceTableWhereInput>({ id }),
      select: { id: true },
    });
    return scope.ensureOwned(row);
  }
}
