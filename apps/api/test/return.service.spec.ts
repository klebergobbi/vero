import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { WhatsAppService } from "../src/integrations/whatsapp/whatsapp.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import { ReturnService } from "../src/return/return.service";

function build(opts: {
  patient?: unknown;
  dueAlerts?: unknown[];
  updateCount?: number;
}) {
  const create = jest.fn().mockResolvedValue({ id: "ra1" });
  const updateMany = jest
    .fn()
    .mockResolvedValue({ count: opts.updateCount ?? 1 });
  const findMany = jest.fn().mockResolvedValue(opts.dueAlerts ?? []);
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    returnAlert: { create, updateMany, findMany, findFirst: jest.fn() },
  } as unknown as PrismaService;
  const sendText = jest.fn().mockResolvedValue(undefined);
  const whatsapp = { sendText } as unknown as WhatsAppService;
  return {
    service: new ReturnService(prisma, whatsapp),
    create,
    updateMany,
    sendText,
  };
}

describe("ReturnService (S33)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.create("t1", { patientId: "alheio", intervalDays: 180 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("create sem dueDate nem intervalDays → 400", async () => {
    const { service } = build({ patient: { id: "p1" } });
    await expect(service.create("t1", { patientId: "p1" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("create com intervalDays calcula dueDate futuro", async () => {
    const { service, create } = build({ patient: { id: "p1" } });
    await service.create("t1", { patientId: "p1", intervalDays: 180 });
    const due = create.mock.calls[0][0].data.dueDate as Date;
    expect(due.getTime()).toBeGreaterThan(Date.now());
  });

  it("runDueAlerts: dispara (TRIGGERED) e envia WhatsApp", async () => {
    const { service, updateMany, sendText } = build({
      dueAlerts: [
        {
          id: "ra1",
          reason: "Profilaxia",
          patient: { name: "Ana", phone: "11999990000" },
        },
      ],
      updateCount: 1,
    });
    const res = await service.runDueAlerts(new Date());
    expect(res.triggered).toBe(1);
    expect(res.sent).toBe(1);
    expect(updateMany.mock.calls[0][0].where.status).toBe("SCHEDULED"); // guarda idempotente
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("runDueAlerts idempotente: updateMany count 0 → não envia (já disparado)", async () => {
    const { service, sendText } = build({
      dueAlerts: [
        {
          id: "ra1",
          reason: null,
          patient: { name: "Ana", phone: "11999990000" },
        },
      ],
      updateCount: 0,
    });
    const res = await service.runDueAlerts(new Date());
    expect(res.triggered).toBe(0);
    expect(sendText).not.toHaveBeenCalled();
  });
});
