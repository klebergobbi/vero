import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { InventoryService } from "../src/inventory/inventory.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function makeTx() {
  return {
    batch: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([
        { id: "b1", quantity: 3 },
        { id: "b2", quantity: 10 },
      ]),
      update: jest.fn().mockResolvedValue({}),
    },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
    item: { update: jest.fn().mockResolvedValue({}) },
  };
}

function build(opts: { item?: unknown }) {
  const tx = makeTx();
  const itemFindFirst = jest.fn().mockResolvedValue(opts.item ?? null);
  const prisma = {
    item: {
      findFirst: itemFindFirst,
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;
  return { service: new InventoryService(prisma), tx };
}

describe("InventoryService (S39)", () => {
  it("anti-IDOR: item de outro tenant → 403", async () => {
    const { service } = build({ item: null });
    await expect(
      service.entrada("t1", "alheio", { quantity: 5 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("entrada: cria lote + movimento IN + incrementa estoque", async () => {
    const { service, tx } = build({ item: { id: "i1", quantity: 0 } });
    // getItem após a transação:
    (
      service as unknown as { prisma: { item: { findFirst: jest.Mock } } }
    ).prisma.item.findFirst
      .mockResolvedValueOnce({ id: "i1", quantity: 0 }) // assertItem
      .mockResolvedValueOnce({ id: "i1", quantity: 5, minQuantity: 2 }); // getItem
    await service.entrada("t1", "i1", { quantity: 5, costCents: 1000 });
    expect(tx.batch.create).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create.mock.calls[0][0].data.type).toBe("IN");
    expect(tx.item.update.mock.calls[0][0].data.quantity.increment).toBe(5);
  });

  it("saída sem estoque suficiente → 400", async () => {
    const { service } = build({ item: { id: "i1", quantity: 2 } });
    await expect(service.saida("t1", "i1", { quantity: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("saída consome lotes por validade (FIFO) e registra baixa por procedimento", async () => {
    const { service, tx } = build({ item: { id: "i1", quantity: 13 } });
    (
      service as unknown as { prisma: { item: { findFirst: jest.Mock } } }
    ).prisma.item.findFirst
      .mockResolvedValueOnce({ id: "i1", quantity: 13 }) // assertItem
      .mockResolvedValueOnce({ id: "i1", quantity: 8, minQuantity: 2 }); // getItem
    await service.saida("t1", "i1", { quantity: 5, procedureId: "proc1" });
    // b1 tem 3 → consome 3; b2 → consome 2 (total 5)
    expect(tx.batch.update).toHaveBeenCalledTimes(2);
    expect(tx.batch.update.mock.calls[0][0].data.quantity.decrement).toBe(3);
    expect(tx.batch.update.mock.calls[1][0].data.quantity.decrement).toBe(2);
    const mov = tx.stockMovement.create.mock.calls[0][0].data;
    expect(mov.type).toBe("OUT");
    expect(mov.procedureId).toBe("proc1"); // baixa por procedimento
  });
});
