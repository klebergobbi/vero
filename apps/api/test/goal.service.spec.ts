import { BadRequestException } from "@nestjs/common";
import { GoalService } from "../src/goal/goal.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  user?: unknown;
  goals?: unknown[];
  paymentSum?: number;
  apptCount?: number;
}) {
  const create = jest
    .fn()
    .mockImplementation(({ data }) => ({ id: "g1", ...data }));
  const prisma = {
    user: { findFirst: jest.fn().mockResolvedValue(opts.user ?? null) },
    goal: {
      create,
      findMany: jest.fn().mockResolvedValue(opts.goals ?? []),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    payment: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amountCents: opts.paymentSum ?? 0 } }),
    },
    appointment: {
      count: jest.fn().mockResolvedValue(opts.apptCount ?? 0),
    },
  } as unknown as PrismaService;
  return { service: new GoalService(prisma), create };
}

const PERIOD = {
  periodStart: "2026-06-01T00:00:00.000Z",
  periodEnd: "2026-06-30T23:59:59.000Z",
};

describe("GoalService (S41)", () => {
  it("período inválido (início ≥ fim) → 400", async () => {
    const { service } = build({});
    await expect(
      service.create("t1", {
        metric: "REVENUE",
        targetValue: 100000,
        periodStart: "2026-06-30T00:00:00.000Z",
        periodEnd: "2026-06-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("profissional inválido → 400", async () => {
    const { service } = build({ user: null });
    await expect(
      service.create("t1", {
        professionalId: "x",
        metric: "APPOINTMENTS",
        targetValue: 50,
        ...PERIOD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("REVENUE: realizado = soma dos pagamentos; percent = realizado/meta", async () => {
    const { service } = build({
      goals: [
        {
          id: "g1",
          professionalId: null,
          metric: "REVENUE",
          targetValue: 100000,
          periodStart: new Date(PERIOD.periodStart),
          periodEnd: new Date(PERIOD.periodEnd),
          professional: null,
        },
      ],
      paymentSum: 75000,
    });
    const res = await service.listWithProgress("t1");
    expect(res[0]?.realized).toBe(75000);
    expect(res[0]?.percent).toBe(75); // 75000 / 100000
  });

  it("APPOINTMENTS: realizado = contagem de consultas", async () => {
    const { service } = build({
      goals: [
        {
          id: "g2",
          professionalId: "u1",
          metric: "APPOINTMENTS",
          targetValue: 40,
          periodStart: new Date(PERIOD.periodStart),
          periodEnd: new Date(PERIOD.periodEnd),
          professional: { name: "Dra. Ana" },
        },
      ],
      apptCount: 30,
    });
    const res = await service.listWithProgress("t1");
    expect(res[0]?.realized).toBe(30);
    expect(res[0]?.percent).toBe(75); // 30 / 40
  });
});
