import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Env } from "../../config/env.validation";

/** Claims do access token assinadas pela AuthService. */
export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  roleId: string;
  type: "access" | "refresh";
}

/** O que é populado em `req.user` para os guards/handlers (S4 usa tenantId/roleId). */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  roleId: string;
}

/**
 * Valida o access token (assinatura + expiração via passport-jwt) e popula req.user.
 * Rejeita tokens que não sejam do tipo "access" (refresh não abre rotas protegidas).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET", { infer: true }),
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== "access") {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
    };
  }
}
