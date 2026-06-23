import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import type { PrismaService } from "../src/prisma/prisma.service";
import { TreatmentService } from "../src/treatment/treatment.service";

function build(opts: {
  budget?: unknown;
  item?: unknown;
  createdPlanId?: string;
}) {
  const planCreate = jest
    .fn()
    .mockResolvedValue({ id: opts.createdPlanId ?? "plan1" });
  const planFindFirst = jest.fn().mockResolvedValue({
    id: "plan1",
    patientId: "p1",
    budgetId: "b1",
    status: "ACTIVE",
    createdAt: new Date(),
    items: [],
  });
  const itemFindFirst = jest.fn().mockResolvedValue(opts.item ?? null);
  const tx = {
    executionLog: { create: jest.fn() },
    treatmentItem: { update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    treatmentPlan: { update: jest.fn() },
  };
  const prisma = {
    budget: { findFirst: jest.fn().mockResolvedValue(opts.budget ?? null) },
    treatmentPlan: {
      create: planCreate,
      findFirst: planFindFirst,
      findMany: jest.fn(),
    },
    treatmentItem: { findFirst: itemFindFirst },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;
  return {
    service: new TreatmentService(prisma),
    planCreate,
    tx,
  };
}

describe("TreatmentService (S30)", () => {
  it("anti-IDOR: orçamento de outro tenant → 403", async () => {
    const { service } = build({ budget: null });
    await expect(service.generateFromBudget("t1", "alheio")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("orçamento não aprovado → 400", async () => {
    const { service } = build({
      budget: { id: "b1", patientId: "p1", status: "OPEN", items: [] },
    });
    await expect(service.generateFromBudget("t1", "b1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("orçamento já com plano → 409", async () => {
    const { service } = build({
      budget: {
        id: "b1",
        patientId: "p1",
        status: "APPROVED",
        treatmentPlan: { id: "plan0" },
        items: [],
      },
    });
    await expect(service.generateFromBudget("t1", "b1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("gera plano de orçamento APROVADO (cria itens dos itens do orçamento)", async () => {
    const { service, planCreate } = build({
      budget: {
        id: "b1",
        patientId: "p1",
        status: "APPROVED",
        treatmentPlan: null,
        items: [{ procedureId: "proc1", description: "Limpeza", quantity: 2 }],
      },
    });
    await service.generateFromBudget("t1", "b1");
    const data = planCreate.mock.calls[0][0].data;
    expect(data.budgetId).toBe("b1");
    expect(data.items.create).toHaveLength(1);
    expect(data.items.create[0].quantity).toBe(2);
  });

  it("executar item já concluído → 409", async () => {
    const { service } = build({
      item: { id: "i1", planId: "plan1", quantity: 2, doneCount: 2 },
    });
    await expect(service.executeItem("t1", "i1", "u1", {})).rejects.toThrow(
      ConflictException,
    );
  });

  it("executar sessão incrementa doneCount e conclui ao atingir quantity", async () => {
    const { service, tx } = build({
      item: { id: "i1", planId: "plan1", quantity: 1, doneCount: 0 },
    });
    await service.executeItem("t1", "i1", "u1", { notes: "ok" });
    expect(tx.executionLog.create).toHaveBeenCalledTimes(1);
    const upd = (tx.treatmentItem.update as jest.Mock).mock.calls[0][0];
    expect(upd.data.doneCount).toBe(1);
    expect(upd.data.status).toBe("DONE");
    // sem itens restantes (count=0) → plano marcado COMPLETED.
    expect(tx.treatmentPlan.update).toHaveBeenCalledTimes(1);
  });
});
