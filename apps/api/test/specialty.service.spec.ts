import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { AuditService } from "../src/common/audit/audit.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { CryptoService } from "../src/record/crypto.service";
import { SpecialtyService } from "../src/specialty/specialty.service";

function build(opts: { patient?: unknown; lastVersion?: number | null }) {
  const create = jest.fn().mockResolvedValue({ id: "sf1" });
  const findFirst = jest
    .fn()
    .mockResolvedValue(
      opts.lastVersion == null ? null : { version: opts.lastVersion },
    );
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    medicalRecord: { upsert: jest.fn().mockResolvedValue({ id: "rec1" }) },
    specialtyForm: { create, findFirst, findMany: jest.fn() },
  } as unknown as PrismaService;
  // crypto identidade: encryptString devolve o próprio texto (asserções simples)
  const crypto = {
    encryptString: jest.fn((s: string) => s),
    decryptString: jest.fn((s: string) => s),
  } as unknown as CryptoService;
  const audit = { record: jest.fn() } as unknown as AuditService;
  return { service: new SpecialtyService(prisma, crypto, audit), create };
}

describe("SpecialtyService (S29)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.save("t1", "alheio", "ORTHO", "u1", { overjet: 3 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("especialidade inválida → 400", async () => {
    const { service } = build({ patient: { id: "p1" } });
    await expect(
      service.save("t1", "p1", "NAO_EXISTE", "u1", {}),
    ).rejects.toThrow(BadRequestException);
  });

  it("1º save → version 1 e filtra campos fora da definição", async () => {
    const { service, create } = build({
      patient: { id: "p1" },
      lastVersion: null,
    });
    const res = await service.save("t1", "p1", "ORTHO", "u1", {
      overjet: 3,
      hacker: "x", // não pertence à ficha ORTHO → ignorado
    });
    expect(res.version).toBe(1);
    const data = create.mock.calls[0][0].data;
    expect(data.version).toBe(1);
    const stored = JSON.parse(data.valuesEnc) as Record<string, unknown>;
    expect(stored).toEqual({ overjet: 3 }); // "hacker" filtrado
  });

  it("save subsequente incrementa a versão (versionado)", async () => {
    const { service, create } = build({
      patient: { id: "p1" },
      lastVersion: 4,
    });
    const res = await service.save("t1", "p1", "ORTHO", "u1", { overjet: 5 });
    expect(res.version).toBe(5);
    expect(create.mock.calls[0][0].data.version).toBe(5);
  });
});
