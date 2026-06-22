import { Prisma } from "@prisma/client";
import { CollectionService } from "../src/collection/collection.service";
import type { WhatsAppService } from "../src/integrations/whatsapp/whatsapp.service";
import type { PrismaService } from "../src/prisma/prisma.service";

const RULE = {
  tenantId: "t1",
  steps: [{ offsetDays: 0, template: "Olá {nome}, parcela vence hoje." }],
};
const INSTALLMENT = {
  id: "i1",
  charge: { patient: { name: "João", phone: "11999998888" } },
};

function build(opts: { eventCreate: jest.Mock }) {
  const sendText = jest.fn().mockResolvedValue({ id: "msg1" });
  const prisma = {
    collectionRule: { findMany: jest.fn().mockResolvedValue([RULE]) },
    installment: { findMany: jest.fn().mockResolvedValue([INSTALLMENT]) },
    collectionEvent: { create: opts.eventCreate },
  } as unknown as PrismaService;
  const whatsapp = { sendText } as unknown as WhatsAppService;
  return { service: new CollectionService(prisma, whatsapp), prisma, sendText };
}

describe("CollectionService.runDueCollections (S22)", () => {
  it("dispara o lembrete e registra o evento (sent=1)", async () => {
    const { service, sendText } = build({
      eventCreate: jest.fn().mockResolvedValue({ id: "ev1" }),
    });
    const res = await service.runDueCollections(
      new Date("2026-07-10T09:00:00Z"),
    );
    expect(res.sent).toBe(1);
    expect(sendText).toHaveBeenCalledWith(
      "11999998888",
      "Olá João, parcela vence hoje.",
    );
  });

  it("idempotente: etapa já enviada (P2002) → skipped, NÃO reenvia", async () => {
    const { service, sendText } = build({
      eventCreate: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("dup", {
          code: "P2002",
          clientVersion: "6",
        }),
      ),
    });
    const res = await service.runDueCollections(
      new Date("2026-07-10T09:00:00Z"),
    );
    expect(res.skipped).toBe(1);
    expect(res.sent).toBe(0);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("respeita opt-out: a query filtra messagingOptOut=false", async () => {
    const { service, prisma } = build({
      eventCreate: jest.fn().mockResolvedValue({ id: "ev1" }),
    });
    await service.runDueCollections(new Date("2026-07-10T09:00:00Z"));
    const where = (prisma.installment.findMany as jest.Mock).mock.calls[0][0]
      .where;
    expect(where.charge.patient.messagingOptOut).toBe(false);
    expect(where.status).toBe("PENDING");
  });
});
