import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

const CACHE_TTL_SECONDS = 300; // 5 min — atende "<2s via cache" sem ficar obsoleto
const SERIES_MONTHS = 6;

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Dashboard analítico (§6/S42): agrega os indicadores-chave do tenant (receita,
 * faturamento, ocupação/consultas, conversão de orçamentos) num só lugar, com
 * CACHE no Redis (TTL curto → carrega <2s) e série mensal p/ os gráficos. O cache
 * é por tenant+período; `invalidate` limpa ao receber um evento. Tenant-scoped.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDashboard(tenantId: string, range?: { from?: string; to?: string }) {
    const to = range?.to ? new Date(range.to) : new Date();
    const from = range?.from ? new Date(range.from) : startOfMonthUtc(to);
    const key = `dashboard:${tenantId}:${from.toISOString()}:${to.toISOString()}`;

    const cached = await this.redis.get(key);
    if (cached) {
      return { ...(JSON.parse(cached) as object), cached: true };
    }

    const data = await this.compute(tenantId, from, to);
    await this.redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SECONDS);
    return { ...data, cached: false };
  }

  /** Invalida o cache do dashboard do tenant (chamar em eventos relevantes). */
  async invalidate(tenantId: string): Promise<{ cleared: number }> {
    const keys = await this.redis.keys(`dashboard:${tenantId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
    return { cleared: keys.length };
  }

  // --- internos ---

  private async compute(tenantId: string, from: Date, to: Date) {
    const range = { gte: from, lte: to };
    const [revenue, billed, appointmentsCount, budgets, series] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: { tenantId, paidAt: range },
          _sum: { amountCents: true },
        }),
        this.prisma.charge.aggregate({
          where: { tenantId, status: { not: "CANCELLED" }, createdAt: range },
          _sum: { totalCents: true },
        }),
        this.prisma.appointment.count({
          where: {
            tenantId,
            status: { not: "CANCELLED" },
            deletedAt: null,
            startsAt: range,
          },
        }),
        this.prisma.budget.groupBy({
          by: ["status"],
          where: { tenantId, decidedAt: range },
          _count: { _all: true },
        }),
        this.monthlySeries(tenantId, to),
      ]);

    const approved =
      budgets.find((b) => b.status === "APPROVED")?._count._all ?? 0;
    const rejected =
      budgets.find((b) => b.status === "REJECTED")?._count._all ?? 0;
    const decided = approved + rejected;
    const conversionPercent =
      decided > 0 ? Math.round((approved / decided) * 100) : 0;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        revenueCents: revenue._sum.amountCents ?? 0,
        billedCents: billed._sum.totalCents ?? 0,
        appointmentsCount,
        conversionPercent,
        approvedBudgets: approved,
        rejectedBudgets: rejected,
      },
      series,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Série dos últimos 6 meses: receita + consultas por mês (p/ os gráficos). */
  private async monthlySeries(tenantId: string, end: Date) {
    const start = startOfMonthUtc(
      new Date(
        Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth() - (SERIES_MONTHS - 1),
          1,
        ),
      ),
    );
    const [payments, appts] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, paidAt: { gte: start, lte: end } },
        select: { amountCents: true, paidAt: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          tenantId,
          status: { not: "CANCELLED" },
          deletedAt: null,
          startsAt: { gte: start, lte: end },
        },
        select: { startsAt: true },
      }),
    ]);

    const buckets = new Map<
      string,
      { month: string; revenueCents: number; appointments: number }
    >();
    for (let i = 0; i < SERIES_MONTHS; i++) {
      const d = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1),
      );
      buckets.set(monthKey(d), {
        month: monthKey(d),
        revenueCents: 0,
        appointments: 0,
      });
    }
    for (const p of payments) {
      const b = buckets.get(monthKey(p.paidAt));
      if (b) b.revenueCents += p.amountCents;
    }
    for (const a of appts) {
      const b = buckets.get(monthKey(a.startsAt));
      if (b) b.appointments += 1;
    }
    return [...buckets.values()];
  }
}
