import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AccountService } from "../src/auth/account.service";
import type { AuditService } from "../src/common/audit/audit.service";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("AccountService (exclusão de conta)", () => {
  function build(overrides?: {
    patient?: unknown;
    user?: unknown;
    gestorCount?: number;
  }) {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue(overrides?.patient ?? null),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(overrides?.user ?? null),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(overrides?.gestorCount ?? 0),
      },
    } as unknown as PrismaService;
    const audit = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;
    return { service: new AccountService(prisma, audit), prisma, audit };
  }

  it("paciente: anonimiza PII, limpa senha (soft-delete) e audita", async () => {
    const { service, prisma, audit } = build({ patient: { id: "p1" } });
    await service.deletePatient("t1", "p1");

    const data = (prisma.patient.update as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Paciente removido",
      cpf: null,
      email: null,
      passwordHash: null, // bloqueia login
    });
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ACCOUNT_DELETED", actorId: "p1" }),
    );
  });

  it("paciente inexistente/fora do escopo → 403 (anti-IDOR), sem update", async () => {
    const { service, prisma } = build({ patient: null });
    await expect(service.deletePatient("t1", "pX")).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it("equipe (não-gestor): anonimiza, desativa e audita", async () => {
    const { service, prisma, audit } = build({
      user: { id: "u1", role: { key: "DENTISTA" } },
    });
    await service.deleteStaff("t1", "u1");

    const data = (prisma.user.update as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({ name: "Usuário removido", isActive: false });
    expect(data.email).toContain("removido+u1@");
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.user.count).not.toHaveBeenCalled(); // só checa gestor se for GESTOR
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ACCOUNT_DELETED", actorId: "u1" }),
    );
  });

  it("gestor com OUTROS gestores ativos: pode excluir", async () => {
    const { service, prisma } = build({
      user: { id: "g1", role: { key: "GESTOR" } },
      gestorCount: 2,
    });
    await service.deleteStaff("t1", "g1");
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("ÚLTIMO gestor ativo: recusa com 409 e não exclui (evita travar o tenant)", async () => {
    const { service, prisma } = build({
      user: { id: "g1", role: { key: "GESTOR" } },
      gestorCount: 1,
    });
    await expect(service.deleteStaff("t1", "g1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
