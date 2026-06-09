import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Env } from "../../config/env.validation";

/** Claims do access token de EQUIPE (assinadas pela AuthService). */
export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  roleId: string;
  type: "access" | "refresh";
}

/** Claims do access token de PACIENTE (assinadas pela PatientAuthService). */
export interface PatientAccessPayload {
  sub: string; // patientId
  tenantId: string;
  type: "patient-access" | "patient-refresh";
}

/** Principal de equipe em `req.user` (guards de RBAC usam tenantId/roleId). */
export interface AuthenticatedUser {
  kind: "staff";
  userId: string;
  tenantId: string;
  roleId: string;
}

/** Principal de paciente em `req.user` (rotas /me/*; NÃO tem papel/permissions). */
export interface AuthenticatedPatient {
  kind: "patient";
  patientId: string;
  tenantId: string;
}

export type Principal = AuthenticatedUser | AuthenticatedPatient;

/**
 * Valida o access token (assinatura + expiração via passport-jwt) e popula req.user.
 * Discrimina por `type`: "access" → principal de equipe; "patient-access" → principal
 * de paciente. Qualquer outro type (refresh/patient-refresh/desconhecido) → 401.
 * O `kind` deixa explícito downstream quem é equipe vs paciente — a PermissionsGuard
 * usa isso para NUNCA deixar um paciente (sem roleId) atingir rota de equipe.
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

  validate(payload: AccessTokenPayload | PatientAccessPayload): Principal {
    if (payload.type === "access") {
      return {
        kind: "staff",
        userId: payload.sub,
        tenantId: payload.tenantId,
        roleId: payload.roleId,
      };
    }
    if (payload.type === "patient-access") {
      return {
        kind: "patient",
        patientId: payload.sub,
        tenantId: payload.tenantId,
      };
    }
    throw new UnauthorizedException();
  }
}
