import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { AuthService } from "../src/auth/auth.service";
import type { LoginDto } from "../src/auth/dto/login.dto";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";

jest.mock("argon2");
const mockedVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>;

describe("AuthService", () => {
  const VALID_LOGIN: LoginDto = {
    tenantSlug: "vero-demo",
    email: "revisor.demo@vero.com.br",
    password: "VeroDemo!2026",
  };

  function build(overrides?: {
    tenant?: unknown;
    user?: unknown;
    getdel?: string | null;
  }) {
    const prisma = {
      tenant: { findFirst: jest.fn().mockResolvedValue(overrides?.tenant) },
      user: { findFirst: jest.fn().mockResolvedValue(overrides?.user) },
      // §S45: login busca a unidade ativa padrão (1ª UserUnit do usuário).
      userUnit: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const redis = {
      set: jest.fn().mockResolvedValue("OK"),
      getdel: jest.fn().mockResolvedValue(overrides?.getdel ?? null),
      del: jest.fn().mockResolvedValue(1),
    } as unknown as RedisService;

    const jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce("access.token")
        .mockResolvedValueOnce("refresh.token")
        .mockResolvedValue("rotated.token"),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    return { service: new AuthService(prisma, redis, jwt), prisma, redis, jwt };
  }

  beforeEach(() => mockedVerify.mockReset());

  it("login válido emite access+refresh e grava o jti no Redis", async () => {
    const { service, redis } = build({
      tenant: { id: "t1" },
      user: { id: "u1", tenantId: "t1", roleId: "r1", passwordHash: "h" },
    });
    mockedVerify.mockResolvedValue(true);

    const tokens = await service.login(VALID_LOGIN);

    expect(tokens).toEqual({
      accessToken: "access.token",
      refreshToken: "refresh.token",
    });
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:refresh:/),
      "u1",
      "EX",
      expect.any(Number),
    );
  });

  it("credencial inválida retorna 401 genérico (não revela usuário vs senha)", async () => {
    // Senha errada.
    const wrongPass = build({
      tenant: { id: "t1" },
      user: { id: "u1", tenantId: "t1", roleId: "r1", passwordHash: "h" },
    });
    mockedVerify.mockResolvedValue(false);
    await expect(wrongPass.service.login(VALID_LOGIN)).rejects.toThrow(
      UnauthorizedException,
    );

    // Usuário inexistente → mesma exceção genérica.
    const noUser = build({ tenant: { id: "t1" }, user: null });
    await expect(noUser.service.login(VALID_LOGIN)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("refresh rotaciona: consome o jti antigo e emite novo par", async () => {
    const { service, redis, jwt } = build({
      user: { id: "u1", tenantId: "t1", roleId: "r1" },
      getdel: "u1", // jti ainda válido no Redis
    });
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "u1",
      tenantId: "t1",
      roleId: "r1",
      type: "refresh",
      jti: "old-jti",
    });

    const tokens = await service.refresh("refresh.jwt");

    // GETDEL invalida o refresh anterior (rotação).
    expect(redis.getdel).toHaveBeenCalledWith("auth:refresh:old-jti");
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    // Reuso do mesmo refresh (jti já consumido → Redis retorna null) → 401.
    const reused = build({ getdel: null });
    (reused.jwt.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "u1",
      tenantId: "t1",
      roleId: "r1",
      type: "refresh",
      jti: "old-jti",
    });
    await expect(reused.service.refresh("refresh.jwt")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("logout revoga o jti do refresh no Redis", async () => {
    const { service, redis, jwt } = build();
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "u1",
      tenantId: "t1",
      roleId: "r1",
      type: "refresh",
      jti: "sess-1",
    });

    await service.logout("refresh.jwt");

    expect(redis.del).toHaveBeenCalledWith("auth:refresh:sess-1");
  });
});
