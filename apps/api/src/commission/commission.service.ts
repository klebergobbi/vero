import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const COMMISSION_SELECT = {
  id: true,
  professionalId: true,
  procedureId: true,
  description: true,
  baseCents: true,
  percent: true,
  amountCents: true,
  status: true,
  reference: true,
  date: true,
  paidAt: true,
  professional: { select: { name: true } },
} satisfies Prisma.CommissionSelect;

/**
 * Comissões (§6/S40): regra por (profissional × procedimento) com percentual; a
 * comissão de um procedimento executado/pago é `base * percent / 100`. A regra
 * específica do procedimento tem prioridade sobre a GERAL (procedureId null) do
 * profissional. Relatório por profissional e período. Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  // --- regras ---

  async createRule(
    tenantId: string,
    input: { professionalId: string; procedureId?: string; percent: number },
  ) {
    const scope = new TenantScope(tenantId);
    await this.assertProfessional(scope, input.professionalId);
    if (input.procedureId) {
      await this.assertProcedure(scope, input.procedureId);
    }
    return this.prisma.commissionRule.create({
      data: {
        tenantId,
        professionalId: input.professionalId,
        procedureId: input.procedureId ?? null,
        percent: input.percent,
      },
      select: {
        id: true,
        professionalId: true,
        procedureId: true,
        percent: true,
        active: true,
        professional: { select: { name: true } },
      },
    });
  }

  async listRules(tenantId: string, professionalId?: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.commissionRule.findMany({
      where: scope.where<Prisma.CommissionRuleWhereInput>({
        active: true,
        ...(professionalId ? { professionalId } : {}),
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        professionalId: true,
        procedureId: true,
        percent: true,
        professional: { select: { name: true } },
      },
    });
  }

  // --- cálculo / registro ---

  /** Calcula a comissão de um procedimento executado/pago e a registra. */
  async record(
    tenantId: string,
    input: {
      professionalId: string;
      procedureId?: string;
      baseCents: number;
      description: string;
      date?: string;
      reference?: string;
    },
  ) {
    const scope = new TenantScope(tenantId);
    await this.assertProfessional(scope, input.professionalId);

    const percent = await this.resolvePercent(
      tenantId,
      input.professionalId,
      input.procedureId,
    );
    if (percent == null) {
      throw new BadRequestException(
        "Sem regra de comissão para o profissional/procedimento.",
      );
    }
    const amountCents = Math.round((input.baseCents * percent) / 100);

    return this.prisma.commission.create({
      data: {
        tenantId,
        professionalId: input.professionalId,
        procedureId: input.procedureId ?? null,
        description: input.description,
        baseCents: input.baseCents,
        percent,
        amountCents,
        date: input.date ? new Date(input.date) : new Date(),
        ...(input.reference ? { reference: input.reference } : {}),
      },
      select: COMMISSION_SELECT,
    });
  }

  /** Marca a comissão como repassada (paga). */
  async markPaid(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.commission.findFirst({
      where: scope.where<Prisma.CommissionWhereInput>({ id }),
      select: { id: true, status: true },
    });
    const c = scope.ensureOwned(found); // 403 anti-IDOR
    if (c.status !== "PENDING") {
      throw new ConflictException("Comissão não está pendente.");
    }
    return this.prisma.commission.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
      select: COMMISSION_SELECT,
    });
  }

  // --- relatório ---

  /** Relatório por profissional e período: lançamentos + total por profissional. */
  async report(
    tenantId: string,
    filter: { professionalId?: string; from?: string; to?: string },
  ) {
    const scope = new TenantScope(tenantId);
    const where = scope.where<Prisma.CommissionWhereInput>({
      status: { not: "CANCELLED" },
      ...(filter.professionalId
        ? { professionalId: filter.professionalId }
        : {}),
      ...(filter.from || filter.to
        ? {
            date: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
    });

    const entries = await this.prisma.commission.findMany({
      where,
      orderBy: { date: "desc" },
      select: COMMISSION_SELECT,
    });

    const totalsMap = new Map<string, { name: string; totalCents: number }>();
    for (const e of entries) {
      const cur = totalsMap.get(e.professionalId) ?? {
        name: e.professional.name,
        totalCents: 0,
      };
      cur.totalCents += e.amountCents;
      totalsMap.set(e.professionalId, cur);
    }
    const totals = [...totalsMap.entries()].map(([professionalId, v]) => ({
      professionalId,
      name: v.name,
      totalCents: v.totalCents,
    }));

    return { entries, totals };
  }

  // --- internos ---

  /** Regra específica do procedimento tem prioridade sobre a geral. */
  private async resolvePercent(
    tenantId: string,
    professionalId: string,
    procedureId?: string,
  ): Promise<number | null> {
    if (procedureId) {
      const specific = await this.prisma.commissionRule.findFirst({
        where: { tenantId, professionalId, procedureId, active: true },
        select: { percent: true },
      });
      if (specific) return specific.percent;
    }
    const general = await this.prisma.commissionRule.findFirst({
      where: { tenantId, professionalId, procedureId: null, active: true },
      select: { percent: true },
    });
    return general?.percent ?? null;
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

  private async assertProcedure(scope: TenantScope, procedureId: string) {
    const proc = await this.prisma.procedure.findFirst({
      where: scope.where<Prisma.ProcedureWhereInput>({ id: procedureId }),
      select: { id: true },
    });
    if (!proc) throw new BadRequestException("Procedimento inválido.");
  }
}
