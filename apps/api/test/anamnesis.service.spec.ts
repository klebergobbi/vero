import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AnamnesisService } from "../src/anamnesis/anamnesis.service";
import type { AuditService } from "../src/common/audit/audit.service";
import type { EsignService } from "../src/integrations/esign/esign.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { CryptoService } from "../src/record/crypto.service";

function build(opts: {
  patient?: unknown;
  template?: unknown;
  fillable?: unknown;
  updateCount?: number;
}) {
  const create = jest.fn().mockResolvedValue({
    id: "an1",
    tokenExpiresAt: new Date(Date.now() + 1000),
  });
  const updateMany = jest
    .fn()
    .mockResolvedValue({ count: opts.updateCount ?? 1 });
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    anamnesisTemplate: {
      findFirst: jest.fn().mockResolvedValue(opts.template ?? null),
    },
    medicalRecord: { upsert: jest.fn().mockResolvedValue({ id: "rec1" }) },
    anamnesis: {
      create,
      updateMany,
      findUnique: jest.fn().mockResolvedValue(opts.fillable ?? null),
    },
  } as unknown as PrismaService;
  const crypto = {
    encryptString: jest.fn().mockReturnValue("ENC"),
  } as unknown as CryptoService;
  const esign = {
    contentHash: jest.fn().mockReturnValue("HASH"),
  } as unknown as EsignService;
  const audit = { record: jest.fn() } as unknown as AuditService;
  return {
    service: new AnamnesisService(prisma, crypto, esign, audit),
    create,
    updateMany,
  };
}

function fillable(extra?: Record<string, unknown>) {
  return {
    id: "an1",
    tenantId: "t1",
    patientId: "p1",
    status: "PENDING",
    tokenExpiresAt: new Date(Date.now() + 60_000),
    patient: { name: "Maria" },
    template: { name: "Geral", questions: [{ id: "q1", label: "Fuma?" }] },
    ...extra,
  };
}

describe("AnamnesisService (S28)", () => {
  it("send anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null, template: { id: "tpl1" } });
    await expect(
      service.send("t1", { patientId: "alheio", templateId: "tpl1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("send: paciente ok mas template inexistente → 404", async () => {
    const { service } = build({ patient: { id: "p1" }, template: null });
    await expect(
      service.send("t1", { patientId: "p1", templateId: "nope" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("submitFill: PENDING → cifra respostas e marca SIGNED", async () => {
    const { service, updateMany } = build({
      fillable: fillable(),
      updateCount: 1,
    });
    const res = await service.submitFill(
      "tok",
      { q1: "não" },
      { ip: "1.2.3.4" },
    );
    expect(res.status).toBe("SIGNED");
    expect(updateMany).toHaveBeenCalledTimes(1);
    const arg = updateMany.mock.calls[0][0];
    expect(arg.where.status).toBe("PENDING"); // guarda de uso único
    expect(arg.data.answersEnc).toBe("ENC"); // respostas cifradas
  });

  it("submitFill uso único: updateMany count 0 → 400", async () => {
    const { service } = build({ fillable: fillable(), updateCount: 0 });
    await expect(
      service.submitFill("tok", { q1: "x" }, { ip: "1.2.3.4" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("getFillForm token expirado → 404", async () => {
    const { service } = build({
      fillable: fillable({ tokenExpiresAt: new Date(Date.now() - 1000) }),
    });
    await expect(service.getFillForm("tok")).rejects.toThrow(NotFoundException);
  });
});
