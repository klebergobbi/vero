import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CrcService } from "../src/crc/crc.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  patient?: unknown;
  user?: unknown;
  task?: unknown;
  alerts?: unknown[];
  createThrows?: unknown;
}) {
  const create = jest.fn().mockImplementation(() => {
    if (opts.createThrows) return Promise.reject(opts.createThrows);
    return Promise.resolve({ id: "task1" });
  });
  const update = jest.fn().mockResolvedValue({ id: "task1" });
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    user: { findFirst: jest.fn().mockResolvedValue(opts.user ?? null) },
    returnAlert: {
      findMany: jest.fn().mockResolvedValue(opts.alerts ?? []),
    },
    cRCTask: {
      create,
      update,
      findFirst: jest.fn().mockResolvedValue(opts.task ?? null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
  return { service: new CrcService(prisma), create, update };
}

describe("CrcService (S34)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.create("t1", { patientId: "alheio", type: "POST_SALE" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("create usa prioridade padrão do tipo quando não informada", async () => {
    const { service, create } = build({ patient: { id: "p1" } });
    await service.create("t1", { patientId: "p1", type: "REACTIVATION" });
    expect(create.mock.calls[0][0].data.priority).toBe(8); // REACTIVATION
  });

  it("assign com responsável inválido → 400", async () => {
    const { service } = build({ task: { id: "task1" }, user: null });
    await expect(service.assign("t1", "task1", "u-invalido")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("markDone marca DONE + doneAt", async () => {
    const { service, update } = build({ task: { id: "task1" } });
    await service.markDone("t1", "task1");
    expect(update.mock.calls[0][0].data.status).toBe("DONE");
    expect(update.mock.calls[0][0].data.doneAt).toBeInstanceOf(Date);
  });

  it("syncReturnAlerts cria tarefas RETURN dos alertas TRIGGERED", async () => {
    const { service, create } = build({
      alerts: [
        {
          id: "ra1",
          patientId: "p1",
          reason: "Profilaxia",
          dueDate: new Date(),
        },
        { id: "ra2", patientId: "p2", reason: null, dueDate: new Date() },
      ],
    });
    const res = await service.syncReturnAlerts("t1");
    expect(res.created).toBe(2);
    expect(create.mock.calls[0][0].data.type).toBe("RETURN");
    expect(create.mock.calls[0][0].data.sourceAlertId).toBe("ra1");
  });

  it("syncReturnAlerts idempotente: P2002 no unique não quebra (skip)", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "x",
    });
    const { service } = build({
      alerts: [
        { id: "ra1", patientId: "p1", reason: null, dueDate: new Date() },
      ],
      createThrows: p2002,
    });
    const res = await service.syncReturnAlerts("t1");
    expect(res.created).toBe(0); // dedupe silencioso
  });
});
