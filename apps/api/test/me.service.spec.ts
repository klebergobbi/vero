import { ConflictException, ForbiddenException } from "@nestjs/common";
import { MeService } from "../src/me/me.service";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("MeService.confirmAppointment (S11)", () => {
  function build(appt: { id: string; status: string } | null) {
    const update = jest.fn();
    const create = jest.fn();
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue(appt),
        update,
      },
      confirmationEvent: { create },
      $transaction: jest
        .fn()
        .mockResolvedValue([{ id: appt?.id, status: "CONFIRMED" }, {}]),
    } as unknown as PrismaService;
    return { service: new MeService(prisma), prisma };
  }

  it("confirma uma consulta SCHEDULED: muda status e registra evento", async () => {
    const { service, prisma } = build({ id: "a1", status: "SCHEDULED" });
    const res = await service.confirmAppointment("t1", "p1", "a1");

    expect(res).toEqual({
      id: "a1",
      status: "CONFIRMED",
      alreadyConfirmed: false,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1); // update + create atômicos
  });

  it("idempotente: já CONFIRMED → no-op, sem novo evento", async () => {
    const { service, prisma } = build({ id: "a1", status: "CONFIRMED" });
    const res = await service.confirmAppointment("t1", "p1", "a1");

    expect(res).toEqual({
      id: "a1",
      status: "CONFIRMED",
      alreadyConfirmed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("recusa confirmar consulta CANCELLED (409)", async () => {
    const { service, prisma } = build({ id: "a1", status: "CANCELLED" });
    await expect(service.confirmAppointment("t1", "p1", "a1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("anti-IDOR: consulta de outro paciente (não encontrada no escopo) → 403", async () => {
    const { service, prisma } = build(null);
    await expect(
      service.confirmAppointment("t1", "p1", "alheia"),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
