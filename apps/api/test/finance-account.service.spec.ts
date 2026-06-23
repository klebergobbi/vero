import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AccountService } from "../src/finance/account.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: { account?: unknown; listRows?: unknown[] }) {
  const create = jest.fn().mockImplementation(({ data }) => ({
    id: "acc1",
    status: "OPEN",
    paidAt: null,
    ...data,
  }));
  const update = jest.fn().mockImplementation(({ data }) => ({
    id: "acc1",
    dueDate: new Date(),
    ...data,
  }));
  const prisma = {
    account: {
      create,
      update,
      findFirst: jest.fn().mockResolvedValue(opts.account ?? null),
      findMany: jest.fn().mockResolvedValue(opts.listRows ?? []),
    },
  } as unknown as PrismaService;
  return { service: new AccountService(prisma), create, update };
}

describe("AccountService finance (S37)", () => {
  it("create lança conta com dueDate convertido", async () => {
    const { service, create } = build({});
    const res = await service.create("t1", {
      type: "PAYABLE",
      description: "Aluguel",
      category: "Fixo",
      amountCents: 250000,
      dueDate: "2026-07-05T00:00:00.000Z",
    });
    expect(create.mock.calls[0][0].data.type).toBe("PAYABLE");
    expect(create.mock.calls[0][0].data.dueDate).toBeInstanceOf(Date);
    expect(res.status).toBe("OPEN");
  });

  it("markPaid faz a baixa manual (PAID + paidAt)", async () => {
    const { service, update } = build({
      account: { id: "acc1", status: "OPEN" },
    });
    await service.markPaid("t1", "acc1");
    expect(update.mock.calls[0][0].data.status).toBe("PAID");
    expect(update.mock.calls[0][0].data.paidAt).toBeInstanceOf(Date);
  });

  it("markPaid de conta não-aberta → 409", async () => {
    const { service } = build({ account: { id: "acc1", status: "PAID" } });
    await expect(service.markPaid("t1", "acc1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("anti-IDOR: conta de outro tenant → 403", async () => {
    const { service } = build({ account: null });
    await expect(service.markPaid("t1", "alheia")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("ATRASO: OPEN com vencimento passado → isOverdue true", async () => {
    const past = new Date(Date.now() - 86400000);
    const future = new Date(Date.now() + 86400000);
    const { service } = build({
      listRows: [
        { id: "a1", status: "OPEN", dueDate: past },
        { id: "a2", status: "OPEN", dueDate: future },
        { id: "a3", status: "PAID", dueDate: past },
      ],
    });
    const res = await service.list("t1", {});
    expect(res.find((a) => a.id === "a1")?.isOverdue).toBe(true);
    expect(res.find((a) => a.id === "a2")?.isOverdue).toBe(false);
    expect(res.find((a) => a.id === "a3")?.isOverdue).toBe(false); // pago
  });
});
