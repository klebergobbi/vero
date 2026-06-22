import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Queue } from "bullmq";
import type { AuditService } from "../src/common/audit/audit.service";
import { CreditService } from "../src/credit/credit.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(patient: unknown) {
  const add = jest.fn().mockResolvedValue({});
  const record = jest.fn().mockResolvedValue(undefined);
  const create = jest.fn().mockResolvedValue({ id: "cc1" });
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(patient) },
    creditCheck: { create },
  } as unknown as PrismaService;
  const queue = { add } as unknown as Queue;
  const audit = { record } as unknown as AuditService;
  return {
    service: new CreditService(prisma, queue, audit),
    add,
    record,
    create,
  };
}

const ACTOR = { actorId: "u1", ip: "::1" };

describe("CreditService.create (S25)", () => {
  it("exige consentimento (base legal) → 400", async () => {
    const { service, create } = build({ id: "p1", cpf: "39053344705" });
    await expect(
      service.create(
        "t1",
        { patientId: "p1", kind: "QUERY", consent: false },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build(null);
    await expect(
      service.create(
        "t1",
        { patientId: "alheio", kind: "QUERY", consent: true },
        ACTOR,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("paciente sem CPF → 400", async () => {
    const { service } = build({ id: "p1", cpf: null });
    await expect(
      service.create(
        "t1",
        { patientId: "p1", kind: "QUERY", consent: true },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("INCLUSION sem valor → 400", async () => {
    const { service } = build({ id: "p1", cpf: "39053344705" });
    await expect(
      service.create(
        "t1",
        { patientId: "p1", kind: "INCLUSION", consent: true },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("CONSULTA: cria, AUDITA (CREDIT_CHECK) e enfileira", async () => {
    const { service, add, record } = build({ id: "p1", cpf: "39053344705" });
    const res = await service.create(
      "t1",
      { patientId: "p1", kind: "QUERY", consent: true },
      ACTOR,
    );
    expect(res).toEqual({ id: "cc1" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREDIT_CHECK",
        actorId: "u1",
        targetId: "p1",
      }),
    );
    expect(add).toHaveBeenCalledWith(
      "process",
      { creditCheckId: "cc1" },
      { jobId: "spc-cc1" },
    );
  });
});
