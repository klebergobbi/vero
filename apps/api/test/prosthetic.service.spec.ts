import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../src/prisma/prisma.service";
import { ProstheticService } from "../src/prosthetic/prosthetic.service";

function build(opts: {
  patient?: unknown;
  order?: unknown;
  listRows?: unknown[];
}) {
  const create = jest.fn().mockImplementation(({ data }) => ({
    id: "po1",
    status: "REQUESTED",
    expectedReturnDate: null,
    receivedAt: null,
    ...data,
  }));
  const update = jest.fn().mockImplementation(({ data }) => ({
    id: "po1",
    expectedReturnDate: null,
    receivedAt: null,
    ...data,
  }));
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    treatmentItem: { findFirst: jest.fn() },
    prostheticOrder: {
      create,
      update,
      findFirst: jest.fn().mockResolvedValue(opts.order ?? null),
      findMany: jest.fn().mockResolvedValue(opts.listRows ?? []),
    },
  } as unknown as PrismaService;
  return { service: new ProstheticService(prisma), create, update };
}

describe("ProstheticService (S35)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.create("t1", {
        patientId: "alheio",
        labName: "Lab",
        description: "Coroa",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("markSent define SENT + sentAt", async () => {
    const { service, update } = build({
      order: { id: "po1", status: "REQUESTED" },
    });
    await service.markSent("t1", "po1", {});
    expect(update.mock.calls[0][0].data.status).toBe("SENT");
    expect(update.mock.calls[0][0].data.sentAt).toBeInstanceOf(Date);
  });

  it("markSent de pedido já RECEIVED → 409", async () => {
    const { service } = build({ order: { id: "po1", status: "RECEIVED" } });
    await expect(service.markSent("t1", "po1", {})).rejects.toThrow(
      ConflictException,
    );
  });

  it("markReceived define RECEIVED + receivedAt", async () => {
    const { service, update } = build({ order: { id: "po1", status: "SENT" } });
    await service.markReceived("t1", "po1");
    expect(update.mock.calls[0][0].data.status).toBe("RECEIVED");
    expect(update.mock.calls[0][0].data.receivedAt).toBeInstanceOf(Date);
  });

  it("ATRASO: SENT com prazo vencido e sem retorno → isLate true", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { service } = build({
      listRows: [
        {
          id: "po1",
          status: "SENT",
          expectedReturnDate: past,
          receivedAt: null,
        },
        {
          id: "po2",
          status: "SENT",
          expectedReturnDate: new Date(Date.now() + 86400000),
          receivedAt: null,
        },
        {
          id: "po3",
          status: "RECEIVED",
          expectedReturnDate: past,
          receivedAt: new Date(),
        },
      ],
    });
    const res = await service.list("t1");
    expect(res.find((o) => o.id === "po1")?.isLate).toBe(true); // vencido
    expect(res.find((o) => o.id === "po2")?.isLate).toBe(false); // prazo futuro
    expect(res.find((o) => o.id === "po3")?.isLate).toBe(false); // já recebido
  });
});
