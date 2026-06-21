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

describe("MeService.checkIn (S14)", () => {
  function build(appt: { id: string; status: string; unitId: string } | null) {
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue(appt),
        update: jest.fn(),
      },
      waitList: { upsert: jest.fn() },
      $transaction: jest
        .fn()
        .mockResolvedValue([{ id: appt?.id, status: "CHECKED_IN" }, {}]),
    } as unknown as PrismaService;
    return { service: new MeService(prisma), prisma };
  }

  it("check-in de consulta SCHEDULED: status CHECKED_IN + entra na fila", async () => {
    const { service, prisma } = build({
      id: "a1",
      status: "SCHEDULED",
      unitId: "u1",
    });
    const res = await service.checkIn("t1", "p1", "a1");

    expect(res).toEqual({
      id: "a1",
      status: "CHECKED_IN",
      alreadyCheckedIn: false,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1); // update + upsert atômicos
  });

  it("idempotente: já CHECKED_IN → no-op, sem duplicar fila", async () => {
    const { service, prisma } = build({
      id: "a1",
      status: "CHECKED_IN",
      unitId: "u1",
    });
    const res = await service.checkIn("t1", "p1", "a1");

    expect(res).toEqual({
      id: "a1",
      status: "CHECKED_IN",
      alreadyCheckedIn: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("recusa check-in de consulta COMPLETED (409)", async () => {
    const { service, prisma } = build({
      id: "a1",
      status: "COMPLETED",
      unitId: "u1",
    });
    await expect(service.checkIn("t1", "p1", "a1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("anti-IDOR: consulta de outro paciente → 403", async () => {
    const { service, prisma } = build(null);
    await expect(service.checkIn("t1", "p1", "alheia")).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
