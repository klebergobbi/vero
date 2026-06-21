import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { BudgetService } from "../src/budget/budget.service";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("BudgetService (S17)", () => {
  it("addItem calcula o total no backend (soma quantity*unitPriceCents)", async () => {
    const budgetUpdate = jest.fn().mockResolvedValue({});
    const tx = {
      budgetItem: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([
          { quantity: 2, unitPriceCents: 12000 },
          { quantity: 1, unitPriceCents: 5000 },
        ]),
      },
      budget: { update: budgetUpdate },
    };
    const prisma = {
      budget: {
        findFirst: jest
          .fn()
          // 1ª: assertOpenBudget · 2ª: getBudget (no fim)
          .mockResolvedValueOnce({ id: "b1", status: "OPEN", planId: null })
          .mockResolvedValueOnce({ id: "b1", items: [] }),
      },
      procedure: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "proc1", name: "Limpeza" }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    } as unknown as PrismaService;
    const service = new BudgetService(prisma);

    await service.addItem("t1", "b1", {
      procedureId: "proc1",
      quantity: 2,
      unitPriceCents: 12000,
    });
    // total = 2*12000 + 1*5000 = 29000 (recalculado no servidor)
    expect(budgetUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { totalCents: 29000 },
    });
  });

  it("addItem em orçamento já decidido → 409", async () => {
    const prisma = {
      budget: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "b1", status: "APPROVED", planId: null }),
      },
    } as unknown as PrismaService;
    const service = new BudgetService(prisma);
    await expect(
      service.addItem("t1", "b1", { procedureId: "p1", unitPriceCents: 100 }),
    ).rejects.toThrow(ConflictException);
  });

  it("setStatus em orçamento já decidido → 409", async () => {
    const prisma = {
      budget: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "b1", status: "REJECTED" }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new BudgetService(prisma);
    await expect(
      service.setStatus("t1", "b1", { status: "APPROVED" }),
    ).rejects.toThrow(ConflictException);
  });

  it("addItem sem preço e sem convênio → 400", async () => {
    const prisma = {
      budget: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "b1", status: "OPEN", planId: null }),
      },
      procedure: {
        findFirst: jest.fn().mockResolvedValue({ id: "proc1", name: "X" }),
      },
    } as unknown as PrismaService;
    const service = new BudgetService(prisma);
    await expect(
      service.addItem("t1", "b1", { procedureId: "proc1" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("anti-IDOR: orçamento de outro tenant → 403", async () => {
    const prisma = {
      budget: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new BudgetService(prisma);
    await expect(service.getBudget("t1", "alheio")).rejects.toThrow(
      ForbiddenException,
    );
  });
});
