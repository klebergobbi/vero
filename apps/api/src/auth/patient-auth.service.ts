import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { normalizeDigits } from "@vero/types";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type { TokenPair } from "./auth.service";
import type { PatientLoginDto } from "./dto/patient-login.dto";

/**
 * Claims do token do App do Paciente. Tipos PRÓPRIOS (`patient-*`) — a JwtStrategy
 * de equipe rejeita qualquer type ≠ "access", então um token de paciente NÃO abre
 * rota de equipe (deny-by-default preservado; CLAUDE.md §4 A01). A rota protegida
 * do paciente (/me/*) e a faixa de guard correspondente chegam na S8b.
 */
export interface PatientTokenPayload {
  sub: string; // patientId
  tenantId: string;
  type: "patient-access" | "patient-refresh";
}

interface PatientRefreshPayload extends PatientTokenPayload {
  jti: string;
}

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

// Mensagem única para qualquer falha (não revela paciente vs senha — §4 A07).
const GENERIC_AUTH_ERROR = "Credenciais inválidas";

@Injectable()
export class PatientAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Login do paciente: tenantSlug + identificador (CPF ou e-mail) + senha (argon2).
   * CPF é único por tenant; e-mail NÃO é — por isso, se o identificador for e-mail
   * e casar com mais de um paciente, devolvemos o mesmo erro genérico (nunca vaza).
   */
  async login(dto: PatientLoginDto): Promise<TokenPair> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    const patient = await this.resolvePatient(tenant.id, dto.identifier);
    // Sem paciente OU sem senha cadastrada (ainda sem acesso ao app) → erro genérico.
    if (!patient?.passwordHash) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    const ok = await argon2.verify(patient.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    return this.issueTokens({ sub: patient.id, tenantId: tenant.id });
  }

  /** Refresh ROTATIVO (whitelist de jti no Redis); reuso do refresh antigo → 401. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefresh(refreshToken);

    const storedPatientId = await this.redis.getdel(
      this.refreshKey(payload.jti),
    );
    if (!storedPatientId || storedPatientId !== payload.sub) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    // Revalida o paciente (pode ter sido removido/anonimizado desde a emissão).
    const patient = await this.prisma.patient.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, tenantId: true, passwordHash: true },
    });
    if (!patient?.passwordHash) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    return this.issueTokens({ sub: patient.id, tenantId: patient.tenantId });
  }

  /** Logout: revoga o jti do refresh apresentado. Idempotente / best-effort. */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefresh(refreshToken);
      await this.redis.del(this.refreshKey(payload.jti));
    } catch {
      // Token inválido/expirado: não vaza detalhe (fail-closed silencioso).
    }
  }

  /** Resolve UM paciente pelo identificador: e-mail (se tiver "@") ou CPF (dígitos). */
  private async resolvePatient(
    tenantId: string,
    identifier: string,
  ): Promise<{ id: string; passwordHash: string | null } | null> {
    if (identifier.includes("@")) {
      // E-mail não é único por tenant: só autentica se casar com EXATAMENTE um.
      const matches = await this.prisma.patient.findMany({
        where: { tenantId, email: identifier, deletedAt: null },
        select: { id: true, passwordHash: true },
        take: 2,
      });
      return matches.length === 1 ? matches[0]! : null;
    }
    const cpf = normalizeDigits(identifier);
    if (!cpf) return null;
    return this.prisma.patient.findFirst({
      where: { tenantId, cpf, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
  }

  private async issueTokens(claims: {
    sub: string;
    tenantId: string;
  }): Promise<TokenPair> {
    const jti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { ...claims, type: "patient-access" } satisfies PatientTokenPayload,
      { expiresIn: ACCESS_TTL },
    );
    const refreshToken = await this.jwt.signAsync(
      {
        ...claims,
        type: "patient-refresh",
        jti,
      } satisfies PatientRefreshPayload,
      { expiresIn: REFRESH_TTL },
    );

    await this.redis.set(
      this.refreshKey(jti),
      claims.sub,
      "EX",
      REFRESH_TTL_SECONDS,
    );
    return { accessToken, refreshToken };
  }

  private async verifyRefresh(token: string): Promise<PatientRefreshPayload> {
    let payload: PatientRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<PatientRefreshPayload>(token);
    } catch {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    if (payload.type !== "patient-refresh" || !payload.jti) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    return payload;
  }

  // Namespace de refresh SEPARADO do de equipe (auth:refresh:*) — sessões distintas.
  private refreshKey(jti: string): string {
    return `auth:patient-refresh:${jti}`;
  }
}
