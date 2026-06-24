import { UnitsService } from "../src/network/units.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  units: { id: string; name: string }[];
  appts: { unitId: string; status: string; _count: { _all: number } }[];
  budgets: { unitId: string; status: string; _count: { _all: number } }[];
  charges: { totalCents: number; budget: { unitId: string | null } }[];
}) {
  const prisma = {
    unit: { findMany: jest.fn().mockResolvedValue(opts.units) },
    appointment: { groupBy: jest.fn().mockResolvedValue(opts.appts) },
    budget: { groupBy: jest.fn().mockResolvedValue(opts.budgets) },
    charge: { findMany: jest.fn().mockResolvedValue(opts.charges) },
  } as unknown as PrismaService;
  return new UnitsService(prisma);
}

describe("UnitsService (S46)", () => {
  it("ranking atribui faturamento/ocupação/conversão por unidade e ordena por faturamento", async () => {
    const service = build({
      units: [
        { id: "u1", name: "Matriz" },
        { id: "u2", name: "Filial" },
      ],
      appts: [
        { unitId: "u1", status: "COMPLETED", _count: { _all: 3 } },
        { unitId: "u1", status: "CANCELLED", _count: { _all: 1 } }, // não conta em "consultas"
        { unitId: "u2", status: "COMPLETED", _count: { _all: 1 } },
        { unitId: "u2", status: "NO_SHOW", _count: { _all: 1 } },
      ],
      budgets: [
        { unitId: "u1", status: "APPROVED", _count: { _all: 3 } },
        { unitId: "u1", status: "REJECTED", _count: { _all: 1 } },
        { unitId: "u2", status: "APPROVED", _count: { _all: 1 } },
      ],
      charges: [
        { totalCents: 50000, budget: { unitId: "u1" } },
        { totalCents: 30000, budget: { unitId: "u1" } },
        { totalCents: 20000, budget: { unitId: "u2" } },
        { totalCents: 99999, budget: { unitId: null } }, // legado sem unidade → ignorado
      ],
    });

    const rank = await service.ranking("t1");

    // Matriz primeiro (maior faturamento 80000 > 20000).
    expect(rank.map((r) => r.unitId)).toEqual(["u1", "u2"]);
    const matriz = rank[0]!;
    expect(matriz.billedCents).toBe(80000); // 50000 + 30000 (null ignorado)
    expect(matriz.appointments).toBe(3); // COMPLETED 3 (CANCELLED fora)
    expect(matriz.completed).toBe(3);
    expect(matriz.conversionPercent).toBe(75); // 3 / (3+1)

    const filial = rank[1]!;
    expect(filial.billedCents).toBe(20000);
    expect(filial.appointments).toBe(2); // COMPLETED 1 + NO_SHOW 1
    expect(filial.noShow).toBe(1);
    expect(filial.conversionPercent).toBe(100); // 1 / 1
  });
});
