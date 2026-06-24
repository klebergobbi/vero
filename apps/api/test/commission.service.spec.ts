import { BadRequestException } from "@nestjs/common";
import { CommissionService } from "../src/commission/commission.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  user?: unknown;
  specificRule?: unknown;
  generalRule?: unknown;
  entries?: unknown[];
}) {
  const commissionCreate = jest
    .fn()
    .mockImplementation(({ data }) => ({ id: "c1", ...data }));
  // ruleFindFirst: 1ª chamada = específica, 2ª = geral
  const ruleFindFirst = jest
    .fn()
    .mockResolvedValueOnce(opts.specificRule ?? null)
    .mockResolvedValueOnce(opts.generalRule ?? null);
  const prisma = {
    user: { findFirst: jest.fn().mockResolvedValue(opts.user ?? null) },
    procedure: { findFirst: jest.fn().mockResolvedValue({ id: "proc1" }) },
    commissionRule: { findFirst: ruleFindFirst, create: jest.fn() },
    commission: {
      create: commissionCreate,
      findMany: jest.fn().mockResolvedValue(opts.entries ?? []),
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;
  return { service: new CommissionService(prisma), commissionCreate };
}

describe("CommissionService (S40)", () => {
  it("profissional inválido → 400", async () => {
    const { service } = build({ user: null });
    await expect(
      service.record("t1", {
        professionalId: "x",
        baseCents: 10000,
        description: "Limpeza",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("sem regra de comissão → 400", async () => {
    const { service } = build({ user: { id: "u1" } });
    await expect(
      service.record("t1", {
        professionalId: "u1",
        baseCents: 10000,
        description: "Limpeza",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("regra específica do procedimento tem prioridade (30%) e calcula base*percent", async () => {
    const { service, commissionCreate } = build({
      user: { id: "u1" },
      specificRule: { percent: 30 },
      generalRule: { percent: 10 },
    });
    const res = await service.record("t1", {
      professionalId: "u1",
      procedureId: "proc1",
      baseCents: 20000,
      description: "Clareamento",
    });
    expect(res.percent).toBe(30); // específica, não a geral
    expect(commissionCreate.mock.calls[0][0].data.amountCents).toBe(6000); // 20000 * 30%
  });

  it("usa a regra GERAL quando não há específica do procedimento", async () => {
    const { service } = build({
      user: { id: "u1" },
      specificRule: null,
      generalRule: { percent: 15 },
    });
    const res = await service.record("t1", {
      professionalId: "u1",
      procedureId: "proc1",
      baseCents: 10000,
      description: "Restauração",
    });
    expect(res.percent).toBe(15);
    expect(res.amountCents).toBe(1500); // 10000 * 15%
  });

  it("report agrega total por profissional", async () => {
    const { service } = build({
      entries: [
        {
          id: "c1",
          professionalId: "u1",
          amountCents: 6000,
          professional: { name: "Dra. Ana" },
        },
        {
          id: "c2",
          professionalId: "u1",
          amountCents: 1500,
          professional: { name: "Dra. Ana" },
        },
        {
          id: "c3",
          professionalId: "u2",
          amountCents: 3000,
          professional: { name: "Dr. Bruno" },
        },
      ],
    });
    const res = await service.report("t1", {});
    const ana = res.totals.find((t) => t.professionalId === "u1");
    expect(ana?.totalCents).toBe(7500); // 6000 + 1500
    expect(res.totals).toHaveLength(2);
  });
});
