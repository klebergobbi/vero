import { Prisma } from "@prisma/client";
import { ReconcileService } from "../src/billing/reconcile.service";
import type { PrismaService } from "../src/prisma/prisma.service";

const EVENT = {
  event: "PAYMENT_RECEIVED",
  asaasPaymentId: "pay_1",
  amountCents: 8000,
};

describe("ReconcileService (S20)", () => {
  it("dá baixa numa parcela PENDING (cria Payment + marca PAID)", async () => {
    const tx = {
      payment: { create: jest.fn().mockResolvedValue({ id: "pmt1" }) },
      reconciliation: { create: jest.fn().mockResolvedValue({}) },
      installment: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ status: "PAID" }]),
      },
      charge: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      installment: {
        findFirst: jest.fn().mockResolvedValue({
          id: "i1",
          tenantId: "t1",
          chargeId: "c1",
          status: "PENDING",
        }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    } as unknown as PrismaService;

    const service = new ReconcileService(prisma);
    expect(await service.reconcile(EVENT)).toBe("reconciled");
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    expect(tx.installment.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "PAID", paidAt: expect.any(Date) },
    });
  });

  it("idempotente por ESTADO: parcela já PAID → no-op", async () => {
    const prisma = {
      installment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "i1", chargeId: "c1", status: "PAID" }),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const service = new ReconcileService(prisma);
    expect(await service.reconcile(EVENT)).toBe("already-reconciled");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("idempotente por UNIQUE: reprocesso (P2002) → already-reconciled", async () => {
    const prisma = {
      installment: {
        findFirst: jest.fn().mockResolvedValue({
          id: "i1",
          tenantId: "t1",
          chargeId: "c1",
          status: "PENDING",
        }),
      },
      $transaction: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("dup", {
          code: "P2002",
          clientVersion: "6",
        }),
      ),
    } as unknown as PrismaService;
    const service = new ReconcileService(prisma);
    expect(await service.reconcile(EVENT)).toBe("already-reconciled");
  });

  it("parcela não encontrada → installment-not-found", async () => {
    const prisma = {
      installment: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const service = new ReconcileService(prisma);
    expect(await service.reconcile(EVENT)).toBe("installment-not-found");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
