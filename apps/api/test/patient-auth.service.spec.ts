import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { PatientLoginDto } from "../src/auth/dto/patient-login.dto";
import { PatientAuthService } from "../src/auth/patient-auth.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";

jest.mock("argon2");
const mockedVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>;

describe("PatientAuthService", () => {
  const LOGIN_CPF: PatientLoginDto = {
    tenantSlug: "vero-demo",
    identifier: "390.533.447-05",
    password: "VeroDemo!2026",
  };
  const LOGIN_EMAIL: PatientLoginDto = {
    tenantSlug: "vero-demo",
    identifier: "paciente.demo@vero.com.br",
    password: "VeroDemo!2026",
  };

  function build(overrides?: {
    tenant?: unknown;
    findFirst?: unknown;
    findMany?: unknown[];
    getdel?: string | null;
  }) {
    const prisma = {
      tenant: { findFirst: jest.fn().mockResolvedValue(overrides?.tenant) },
      patient: {
        findFirst: jest.fn().mockResolvedValue(overrides?.findFirst ?? null),
        findMany: jest.fn().mockResolvedValue(overrides?.findMany ?? []),
      },
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

    return {
      service: new PatientAuthService(prisma, redis, jwt),
      prisma,
      redis,
      jwt,
    };
  }

  beforeEach(() => mockedVerify.mockReset());

  it("login por CPF emite tokens e grava o jti no namespace do paciente", async () => {
    const { service, redis } = build({
      tenant: { id: "t1" },
      findFirst: { id: "p1", passwordHash: "h" },
    });
    mockedVerify.mockResolvedValue(true);

    const tokens = await service.login(LOGIN_CPF);

    expect(tokens).toEqual({
      accessToken: "access.token",
      refreshToken: "refresh.token",
    });
    // Namespace SEPARADO da auth de equipe (não colide com auth:refresh:*).
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:patient-refresh:/),
      "p1",
      "EX",
      expect.any(Number),
    );
  });

  it("login por e-mail só autentica se casar com EXATAMENTE um paciente", async () => {
    // Dois pacientes com o mesmo e-mail (não único) → erro genérico, nunca vaza.
    const ambiguous = build({
      tenant: { id: "t1" },
      findMany: [
        { id: "p1", passwordHash: "h" },
        { id: "p2", passwordHash: "h" },
      ],
    });
    mockedVerify.mockResolvedValue(true);
    await expect(ambiguous.service.login(LOGIN_EMAIL)).rejects.toThrow(
      UnauthorizedException,
    );

    // Exatamente um → autentica.
    const unique = build({
      tenant: { id: "t1" },
      findMany: [{ id: "p1", passwordHash: "h" }],
    });
    mockedVerify.mockResolvedValue(true);
    const tokens = await unique.service.login(LOGIN_EMAIL);
    expect(tokens.accessToken).toBe("access.token");
  });

  it("credencial inválida (senha errada / sem senha / paciente inexistente) → 401 genérico", async () => {
    const wrongPass = build({
      tenant: { id: "t1" },
      findFirst: { id: "p1", passwordHash: "h" },
    });
    mockedVerify.mockResolvedValue(false);
    await expect(wrongPass.service.login(LOGIN_CPF)).rejects.toThrow(
      UnauthorizedException,
    );

    // Paciente sem senha cadastrada (ainda sem acesso ao app).
    const noPass = build({
      tenant: { id: "t1" },
      findFirst: { id: "p1", passwordHash: null },
    });
    await expect(noPass.service.login(LOGIN_CPF)).rejects.toThrow(
      UnauthorizedException,
    );

    // Paciente inexistente.
    const noPatient = build({ tenant: { id: "t1" }, findFirst: null });
    await expect(noPatient.service.login(LOGIN_CPF)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("refresh rotaciona (consome jti) e reuso do antigo → 401", async () => {
    const { service, redis, jwt } = build({
      findFirst: { id: "p1", tenantId: "t1", passwordHash: "h" },
      getdel: "p1",
    });
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "p1",
      tenantId: "t1",
      type: "patient-refresh",
      jti: "old-jti",
    });

    const tokens = await service.refresh("refresh.jwt");
    expect(redis.getdel).toHaveBeenCalledWith("auth:patient-refresh:old-jti");
    expect(tokens.refreshToken).toBeDefined();

    // Reuso: jti já consumido (Redis null) → 401.
    const reused = build({ getdel: null });
    (reused.jwt.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "p1",
      tenantId: "t1",
      type: "patient-refresh",
      jti: "old-jti",
    });
    await expect(reused.service.refresh("refresh.jwt")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("refresh rejeita token cujo type não é patient-refresh", async () => {
    const { service, jwt } = build({ getdel: "p1" });
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "p1",
      tenantId: "t1",
      type: "refresh", // token de equipe não serve no fluxo do paciente
      jti: "x",
    });
    await expect(service.refresh("refresh.jwt")).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
