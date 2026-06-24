import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

export interface UnitRankRow {
  unitId: string;
  name: string;
  billedCents: number;
  appointments: number;
  completed: number;
  noShow: number;
  approvedBudgets: number;
  rejectedBudgets: number;
  conversionPercent: number;
}

/**
 * Gestão de rede (§6/S46): comparativo + ranking entre as unidades do tenant
 * (visão do franqueador). Atribui por unidade as métricas dimensionadas:
 * - ocupação/consultas via `Appointment.unitId`;
 * - faturamento via `Charge` → `Budget.unitId` (capturado da unidade ativa, S45);
 * - conversão via `Budget` decidido, agrupado por unidade.
 * Tenant-scoped (anti-IDOR). Orçamentos legados sem unidade ficam fora do rateio.
 */
@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async ranking(tenantId: string): Promise<UnitRankRow[]> {
    const scope = new TenantScope(tenantId);
    const [units, apptGroups, budgetGroups, charges] = await Promise.all([
      this.prisma.unit.findMany({
        where: scope.where<Prisma.UnitWhereInput>({ deletedAt: null }),
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      // Consultas por unidade × status (ocupação/comparecimento).
      this.prisma.appointment.groupBy({
        by: ["unitId", "status"],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
      }),
      // Conversão por unidade: orçamentos já decididos.
      this.prisma.budget.groupBy({
        by: ["unitId", "status"],
        where: { tenantId, unitId: { not: null }, decidedAt: { not: null } },
        _count: { _all: true },
      }),
      // Faturamento por unidade: cobranças não-canceladas via Budget.unitId.
      this.prisma.charge.findMany({
        where: {
          tenantId,
          status: { not: "CANCELLED" },
          budget: { unitId: { not: null } },
        },
        select: { totalCents: true, budget: { select: { unitId: true } } },
      }),
    ]);

    const billedByUnit = new Map<string, number>();
    for (const c of charges) {
      const uid = c.budget.unitId;
      if (!uid) continue;
      billedByUnit.set(uid, (billedByUnit.get(uid) ?? 0) + c.totalCents);
    }

    const rows: UnitRankRow[] = units.map((u) => {
      const appts = apptGroups.filter((g) => g.unitId === u.id);
      const apptCount = (status?: string) =>
        appts
          .filter((g) =>
            status ? g.status === status : g.status !== "CANCELLED",
          )
          .reduce((sum, g) => sum + g._count._all, 0);

      const buds = budgetGroups.filter((g) => g.unitId === u.id);
      const budCount = (status: string) =>
        buds
          .filter((g) => g.status === status)
          .reduce((sum, g) => sum + g._count._all, 0);
      const approved = budCount("APPROVED");
      const rejected = budCount("REJECTED");
      const decided = approved + rejected;

      return {
        unitId: u.id,
        name: u.name,
        billedCents: billedByUnit.get(u.id) ?? 0,
        appointments: apptCount(),
        completed: apptCount("COMPLETED"),
        noShow: apptCount("NO_SHOW"),
        approvedBudgets: approved,
        rejectedBudgets: rejected,
        conversionPercent:
          decided > 0 ? Math.round((approved / decided) * 100) : 0,
      };
    });

    // Ranking: maior faturamento primeiro; desempate por volume de consultas.
    rows.sort(
      (a, b) =>
        b.billedCents - a.billedCents || b.appointments - a.appointments,
    );
    return rows;
  }
}
