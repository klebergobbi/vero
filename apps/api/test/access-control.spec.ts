import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { AuditService } from "../src/common/audit/audit.service";
import { PermissionsGuard } from "../src/common/guards/permissions.guard";
import { TenantGuard } from "../src/common/guards/tenant.guard";
import { IS_PATIENT_KEY } from "../src/common/decorators/patient.decorator";
import { IS_PUBLIC_KEY } from "../src/common/decorators/public.decorator";
import { IS_SELF_ACCOUNT_KEY } from "../src/common/decorators/self-account.decorator";
import { TenantScope } from "../src/common/repositories/tenant-scoped.helper";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";

// ExecutionContext falso: retorna `request` e permite mockar metadados via reflector.
function ctxFor(request: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function reflectorFor(meta: {
  isPublic?: boolean;
  isPatientRoute?: boolean;
  isSelfAccount?: boolean;
  permissions?: string[];
}): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return meta.isPublic;
      if (key === IS_PATIENT_KEY) return meta.isPatientRoute;
      if (key === IS_SELF_ACCOUNT_KEY) return meta.isSelfAccount;
      return meta.permissions;
    }),
  } as unknown as Reflector;
}

describe("TenantScope (anti-IDOR)", () => {
  it("injeta tenantId no where e nega recurso fora do escopo (tenant A → recurso B)", () => {
    const scopeA = new TenantScope("tenant-A");

    // O filtro SEMPRE carrega o tenant do usuário.
    expect(scopeA.where({ id: "rec-de-B" })).toEqual({
      id: "rec-de-B",
      tenantId: "tenant-A",
    });
    expect(scopeA.ownerWhere("owner-1", { id: "x" })).toEqual({
      id: "x",
      tenantId: "tenant-A",
      ownerId: "owner-1",
    });

    // Query do recurso de B com filtro de A → Prisma retorna null → 403.
    const queriedFromOtherTenant = null;
    expect(() => scopeA.ensureOwned(queriedFromOtherTenant)).toThrow(
      ForbiddenException,
    );
    // Dentro do escopo → devolve o registro.
    const owned = { id: "rec-de-A" };
    expect(scopeA.ensureOwned(owned)).toBe(owned);
  });
});

describe("TenantGuard", () => {
  it("nega (401) quando não há tenant no contexto", () => {
    const guard = new TenantGuard(reflectorFor({}));
    expect(() => guard.canActivate(ctxFor({ user: undefined }))).toThrow(
      UnauthorizedException,
    );
  });

  it("permite e injeta tenantId quando o usuário tem tenant", () => {
    const guard = new TenantGuard(reflectorFor({}));
    const req: { user: { tenantId: string }; tenantId?: string } = {
      user: { tenantId: "t1" } as never,
    };
    expect(guard.canActivate(ctxFor(req))).toBe(true);
    expect(req.tenantId).toBe("t1");
  });

  it("libera rota pública sem exigir tenant", () => {
    const guard = new TenantGuard(reflectorFor({ isPublic: true }));
    expect(guard.canActivate(ctxFor({ user: undefined }))).toBe(true);
  });
});

describe("PermissionsGuard (deny-by-default)", () => {
  function build(meta: {
    isPublic?: boolean;
    isPatientRoute?: boolean;
    isSelfAccount?: boolean;
    permissions?: string[];
  }) {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const redis = { get: jest.fn(), set: jest.fn() };
    const prisma = {
      rolePermission: { findMany: jest.fn() },
    };
    const guard = new PermissionsGuard(
      reflectorFor(meta),
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      audit as unknown as AuditService,
    );
    return { guard, audit, redis, prisma };
  }

  const user = { userId: "u1", tenantId: "t1", roleId: "r1" };

  it("NEGA rota sem @Permissions e audita AUTHZ_DENIED", async () => {
    const { guard, audit } = build({}); // sem permissions declaradas
    await expect(guard.canActivate(ctxFor({ user }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTHZ_DENIED", actorId: "u1" }),
    );
  });

  it("NEGA quando o papel não tem a permission exigida e audita", async () => {
    const { guard, audit, redis, prisma } = build({
      permissions: ["patient:write"],
    });
    redis.get.mockResolvedValue(null);
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: { key: "patient:read" } },
    ]);

    await expect(guard.canActivate(ctxFor({ user }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTHZ_DENIED" }),
    );
  });

  it("PERMITE quando o papel tem todas as permissions exigidas (e cacheia)", async () => {
    const { guard, audit, redis, prisma } = build({
      permissions: ["patient:read"],
    });
    redis.get.mockResolvedValue(null);
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: { key: "patient:read" } },
      { permission: { key: "patient:write" } },
    ]);

    await expect(guard.canActivate(ctxFor({ user }))).resolves.toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
    // Cacheou o conjunto de permissions do papel.
    expect(redis.set).toHaveBeenCalledWith(
      "rbac:perms:r1",
      expect.any(String),
      "EX",
      expect.any(Number),
    );
  });

  it("usa o cache do Redis quando disponível (sem hit no DB)", async () => {
    const { guard, redis, prisma } = build({ permissions: ["patient:read"] });
    redis.get.mockResolvedValue(JSON.stringify(["patient:read"]));

    await expect(guard.canActivate(ctxFor({ user }))).resolves.toBe(true);
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it("libera rota pública sem checar permission", async () => {
    const { guard, prisma } = build({ isPublic: true });
    await expect(guard.canActivate(ctxFor({ user: undefined }))).resolves.toBe(
      true,
    );
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  // --- Faixa do App do Paciente (S8b) ---
  const patient = { kind: "patient", patientId: "p1", tenantId: "t1" };

  it("rota @Patient: PERMITE principal de paciente sem checar papel", async () => {
    const { guard, prisma } = build({ isPatientRoute: true });
    await expect(guard.canActivate(ctxFor({ user: patient }))).resolves.toBe(
      true,
    );
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it("rota @Patient: NEGA token de equipe (não é principal de paciente)", async () => {
    const { guard, audit } = build({ isPatientRoute: true });
    await expect(guard.canActivate(ctxFor({ user }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTHZ_DENIED" }),
    );
  });

  it("rota de EQUIPE: NEGA principal de paciente ANTES de qualquer query (endurecimento)", async () => {
    const { guard, prisma } = build({ permissions: ["appointment:read"] });
    await expect(guard.canActivate(ctxFor({ user: patient }))).rejects.toThrow(
      ForbiddenException,
    );
    // Crítico: nunca consulta o DB com roleId ausente (evitaria vazar todas as perms).
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it("rota @SelfAccount: PERMITE qualquer principal autenticado (paciente ou equipe)", async () => {
    const { guard, prisma } = build({ isSelfAccount: true });
    await expect(guard.canActivate(ctxFor({ user: patient }))).resolves.toBe(
      true,
    );
    await expect(guard.canActivate(ctxFor({ user }))).resolves.toBe(true);
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it("rota @SelfAccount: NEGA quando não há principal autenticado", async () => {
    const { guard } = build({ isSelfAccount: true });
    await expect(
      guard.canActivate(ctxFor({ user: undefined })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rota de EQUIPE: NEGA principal sem roleId sem consultar o DB", async () => {
    const { guard, prisma } = build({ permissions: ["appointment:read"] });
    const noRole = { tenantId: "t1", userId: "u9" }; // roleId ausente
    await expect(guard.canActivate(ctxFor({ user: noRole }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });
});
