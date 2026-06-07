import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type { LoginDto } from "./dto/login.dto";
import type { AccessTokenPayload } from "./strategies/jwt.strategy";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string;
}

// Access curto (CLAUDE.md §4 — A07); refresh longo, mas revogável via Redis.
const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

// Mensagem única para qualquer falha de credencial (não revela usuário vs senha).
const GENERIC_AUTH_ERROR = "Credenciais inválidas";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  /** Login: valida tenant+usuário+senha (argon2) e emite o par de tokens. */
  async login(dto: LoginDto): Promise<TokenPair> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: dto.email,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        roleId: true,
        passwordHash: true,
      },
    });
    // Mesmo erro genérico se o usuário não existe ou a senha não confere.
    if (!user) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    return this.issueTokens({
      sub: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
    });
  }

  /**
   * Refresh ROTATIVO: valida o refresh token, confere o `jti` no Redis, revoga o
   * antigo (deixa de funcionar) e emite um novo par. Reuso de token antigo → 401.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefresh(refreshToken);

    // Consome o jti atual de forma atômica: se não existir, já foi usado/revogado.
    const storedUserId = await this.redis.getdel(this.refreshKey(payload.jti));
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    // Revalida o usuário (pode ter sido desativado/removido desde a emissão).
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: { id: true, tenantId: true, roleId: true },
    });
    if (!user) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    return this.issueTokens({
      sub: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
    });
  }

  /** Logout: revoga o `jti` do refresh token apresentado. Idempotente. */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefresh(refreshToken);
      await this.redis.del(this.refreshKey(payload.jti));
    } catch {
      // Token inválido/expirado: logout é best-effort, não vaza detalhe (fail-closed silencioso).
    }
  }

  private async issueTokens(
    claims: Omit<AccessTokenPayload, "type">,
  ): Promise<TokenPair> {
    const jti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { ...claims, type: "access" } satisfies AccessTokenPayload,
      { expiresIn: ACCESS_TTL },
    );

    const refreshToken = await this.jwt.signAsync(
      { ...claims, type: "refresh", jti } satisfies RefreshTokenPayload,
      { expiresIn: REFRESH_TTL },
    );

    // Whitelist do refresh: a sessão só é válida enquanto o jti existir no Redis.
    await this.redis.set(
      this.refreshKey(jti),
      claims.sub,
      "EX",
      REFRESH_TTL_SECONDS,
    );

    return { accessToken, refreshToken };
  }

  private async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token);
    } catch {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    if (payload.type !== "refresh" || !payload.jti) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    return payload;
  }

  private refreshKey(jti: string): string {
    return `auth:refresh:${jti}`;
  }
}
