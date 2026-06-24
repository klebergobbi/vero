import { DashboardService } from "../src/analytics/dashboard.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";

function build(opts: {
  cached?: string | null;
  revenue?: number;
  billed?: number;
  appts?: number;
  budgets?: { status: string; _count: { _all: number } }[];
}) {
  const get = jest.fn().mockResolvedValue(opts.cached ?? null);
  const set = jest.fn().mockResolvedValue("OK");
  const keys = jest
    .fn()
    .mockResolvedValue(["dashboard:t1:a", "dashboard:t1:b"]);
  const del = jest.fn().mockResolvedValue(2);
  const redis = { get, set, keys, del } as unknown as RedisService;
  const prisma = {
    payment: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amountCents: opts.revenue ?? 0 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    charge: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { totalCents: opts.billed ?? 0 } }),
    },
    appointment: {
      count: jest.fn().mockResolvedValue(opts.appts ?? 0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    budget: { groupBy: jest.fn().mockResolvedValue(opts.budgets ?? []) },
  } as unknown as PrismaService;
  return { service: new DashboardService(prisma, redis), get, set, keys, del };
}

describe("DashboardService (S42)", () => {
  it("cache MISS: agrega e grava no Redis (cached=false)", async () => {
    const { service, set } = build({
      revenue: 50000,
      billed: 80000,
      appts: 12,
      budgets: [
        { status: "APPROVED", _count: { _all: 3 } },
        { status: "REJECTED", _count: { _all: 1 } },
      ],
    });
    const res = await service.getDashboard("t1");
    expect(res.cached).toBe(false);
    expect(res.kpis.revenueCents).toBe(50000);
    expect(res.kpis.billedCents).toBe(80000);
    expect(res.kpis.appointmentsCount).toBe(12);
    expect(res.kpis.conversionPercent).toBe(75); // 3 / (3+1)
    expect(set).toHaveBeenCalledTimes(1); // gravou no cache
  });

  it("cache HIT: devolve o cacheado (cached=true) sem agregar", async () => {
    const payload = JSON.stringify({ kpis: { revenueCents: 999 } });
    const { service, set } = build({ cached: payload });
    const res = await service.getDashboard("t1");
    expect(res.cached).toBe(true);
    expect(res.kpis.revenueCents).toBe(999);
    expect(set).not.toHaveBeenCalled(); // não regrava em hit
  });

  it("conversão 0% quando não há orçamentos decididos", async () => {
    const { service } = build({ budgets: [] });
    const res = await service.getDashboard("t1");
    expect(res.kpis.conversionPercent).toBe(0);
  });

  it("invalidate limpa as chaves do tenant", async () => {
    const { service, del } = build({});
    const res = await service.invalidate("t1");
    expect(res.cleared).toBe(2);
    expect(del).toHaveBeenCalledTimes(1);
  });
});
