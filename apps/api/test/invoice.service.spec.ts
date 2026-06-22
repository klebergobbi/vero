import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { Queue } from "bullmq";
import { InvoiceService } from "../src/invoice/invoice.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(payment: unknown, created?: { id: string }) {
  const add = jest.fn().mockResolvedValue({});
  const create = jest.fn().mockResolvedValue(created ?? { id: "inv1" });
  const prisma = {
    payment: { findFirst: jest.fn().mockResolvedValue(payment) },
    invoice: { create },
  } as unknown as PrismaService;
  const queue = { add } as unknown as Queue;
  return { service: new InvoiceService(prisma, queue), add, create };
}

describe("InvoiceService.createForPayment (S23)", () => {
  it("anti-IDOR: pagamento de outro tenant → 403", async () => {
    const { service, create } = build(null);
    await expect(service.createForPayment("t1", "alheio")).rejects.toThrow(
      ForbiddenException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("pagamento que já tem NFS-e → 409", async () => {
    const { service, create } = build({
      id: "pmt1",
      amountCents: 8000,
      invoice: { id: "inv0" },
    });
    await expect(service.createForPayment("t1", "pmt1")).rejects.toThrow(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("cria a Invoice (PENDING) e enfileira a emissão (jobId determinístico)", async () => {
    const { service, add, create } = build(
      { id: "pmt1", amountCents: 8000, invoice: null },
      { id: "inv1" },
    );
    const inv = await service.createForPayment("t1", "pmt1");
    expect(inv).toEqual({ id: "inv1" });
    expect(create).toHaveBeenCalledWith({
      data: { tenantId: "t1", paymentId: "pmt1", amountCents: 8000 },
    });
    expect(add).toHaveBeenCalledWith(
      "emit",
      { invoiceId: "inv1" },
      { jobId: "nfse-inv1" },
    );
  });
});
