import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CashFlowService } from "../src/finance/cashflow.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  flow?: unknown;
  payments?: unknown[];
  grouped?: unknown[];
  createThrows?: unknown;
}) {
  const cashCreate = jest.fn().mockImplementation(() => {
    if (opts.createThrows) return Promise.reject(opts.createThrows);
    return Promise.resolve({ id: "cf1" });
  });
  const reconCreate = jest.fn().mockResolvedValue({ id: "br1" });
  const cashFindFirst = jest.fn().mockResolvedValue(opts.flow ?? null);
  const prisma = {
    payment: { findMany: jest.fn().mockResolvedValue(opts.payments ?? []) },
    cashFlow: {
      create: cashCreate,
      findFirst: cashFindFirst,
      findMany: jest.fn(),
      groupBy: jest.fn().mockResolvedValue(opts.grouped ?? []),
    },
    bankReconciliation: { create: reconCreate },
  } as unknown as PrismaService;
  return {
    service: new CashFlowService(prisma),
    cashCreate,
    reconCreate,
  };
}

describe("CashFlowService (S38)", () => {
  it("record cria movimento MANUAL com data convertida", async () => {
    const { service, cashCreate } = build({});
    await service.record("t1", {
      direction: "OUT",
      amountCents: 5000,
      date: "2026-07-01T00:00:00.000Z",
      category: "Despesa",
      description: "Conta de luz",
    });
    const data = cashCreate.mock.calls[0][0].data;
    expect(data.source).toBe("MANUAL");
    expect(data.direction).toBe("OUT");
    expect(data.date).toBeInstanceOf(Date);
  });

  it("syncPayments importa pagamentos da S20 como entradas conciliadas AUTO", async () => {
    const { service, cashCreate } = build({
      payments: [
        { id: "pay1", amountCents: 10000, paidAt: new Date() },
        { id: "pay2", amountCents: 20000, paidAt: new Date() },
      ],
    });
    const res = await service.syncPayments("t1");
    expect(res.imported).toBe(2);
    const data = cashCreate.mock.calls[0][0].data;
    expect(data.source).toBe("PAYMENT");
    expect(data.direction).toBe("IN");
    expect(data.paymentId).toBe("pay1");
    expect(data.reconciliation.create.method).toBe("AUTO"); // conciliado automaticamente
  });

  it("syncPayments idempotente: P2002 no unique paymentId → skip", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "x",
    });
    const { service } = build({
      payments: [{ id: "pay1", amountCents: 10000, paidAt: new Date() }],
      createThrows: p2002,
    });
    const res = await service.syncPayments("t1");
    expect(res.imported).toBe(0);
  });

  it("reconcile MANUAL: cria BankReconciliation (method MANUAL)", async () => {
    const { service, reconCreate } = build({
      flow: { id: "cf1", reconciliation: null },
    });
    await service.reconcile("t1", "cf1", { reference: "OFX-123" });
    const data = reconCreate.mock.calls[0][0].data;
    expect(data.method).toBe("MANUAL");
    expect(data.reference).toBe("OFX-123");
  });

  it("reconcile de movimento já conciliado → 409", async () => {
    const { service } = build({
      flow: { id: "cf1", reconciliation: { id: "br0" } },
    });
    await expect(service.reconcile("t1", "cf1", {})).rejects.toThrow(
      ConflictException,
    );
  });

  it("reconcile anti-IDOR: movimento de outro tenant → 403", async () => {
    const { service } = build({ flow: null });
    await expect(service.reconcile("t1", "alheio", {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("summary calcula entradas, saídas e saldo do período", async () => {
    const { service } = build({
      grouped: [
        { direction: "IN", _sum: { amountCents: 30000 } },
        { direction: "OUT", _sum: { amountCents: 5000 } },
      ],
    });
    const res = await service.summary("t1", {});
    expect(res.inCents).toBe(30000);
    expect(res.outCents).toBe(5000);
    expect(res.balanceCents).toBe(25000);
  });
});
