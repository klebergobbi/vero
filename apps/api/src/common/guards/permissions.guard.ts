import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PermissionKey } from "@vero/types";
import type { Principal } from "../../auth/strategies/jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService, type AuditInput } from "../audit/audit.service";
import { IS_PATIENT_KEY } from "../decorators/patient.decorator";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Cache curto das permissions de um papel (evita hit no DB por request).
const PERMS_CACHE_TTL_SECONDS = 300;

interface PermRequest {
  user?: Principal;
  ip?: string;
}

/**
 * Autorização DENY-BY-DEFAULT (CLAUDE.md §4 A01). Roda após JwtAuthGuard+TenantGuard.
 * - Rota sem @Permissions (e não @Public) → NEGADA.
 * - Usuário sem TODAS as permissions exigidas → NEGADO.
 * - Toda negação gera AuditLog AUTHZ_DENIED (sem PII).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<PermRequest>();
    const user = req.user;

    // Faixa do APP DO PACIENTE: exige principal de paciente; sem checagem de papel.
    const isPatientRoute = this.reflector.getAllAndOverride<boolean>(
      IS_PATIENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPatientRoute) {
      if (user?.kind !== "patient") {
        await this.recordDenial(
          user,
          req.ip,
          "rota-paciente:principal-invalido",
        );
        throw new ForbiddenException();
      }
      return true;
    }

    // --- Rota de EQUIPE (deny-by-default) ---
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Deny-by-default: rota protegida sem permissão declarada é negada.
    if (!required || required.length === 0) {
      await this.recordDenial(user, req.ip, "rota-sem-permissao-declarada");
      throw new ForbiddenException();
    }
    // ENDURECIMENTO (S8b): um paciente (ou principal sem roleId) NUNCA satisfaz
    // rota de equipe — sem isto, roleId ausente faria o Prisma omitir o filtro e
    // retornar TODAS as permissions do tenant. Negar antes de qualquer query.
    if (!user || user.kind === "patient" || !user.roleId) {
      await this.recordDenial(user, req.ip, required.join(","));
      throw new ForbiddenException();
    }

    const granted = await this.loadPermissions(user.tenantId, user.roleId);
    const hasAll = required.every((key) => granted.has(key));
    if (!hasAll) {
      await this.recordDenial(user, req.ip, required.join(","));
      throw new ForbiddenException();
    }
    return true;
  }

  private async recordDenial(
    user: Principal | undefined,
    ip: string | undefined,
    required: string,
  ): Promise<void> {
    if (!user) return;
    const input: AuditInput = {
      tenantId: user.tenantId,
      action: "AUTHZ_DENIED",
      actorId: user.kind === "patient" ? user.patientId : user.userId,
      metadata:
        user.kind === "patient"
          ? { required, kind: "patient" }
          : { required, roleId: user.roleId },
    };
    if (ip !== undefined) input.ip = ip;
    await this.audit.record(input);
  }

  private async loadPermissions(
    tenantId: string,
    roleId: string,
  ): Promise<Set<string>> {
    const cacheKey = `rbac:perms:${roleId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return new Set(JSON.parse(cached) as string[]);
    }

    const rows = await this.prisma.rolePermission.findMany({
      where: { tenantId, roleId }, // tenant-scoped (anti-IDOR também aqui)
      select: { permission: { select: { key: true } } },
    });
    const keys = rows.map((row) => row.permission.key);
    await this.redis.set(
      cacheKey,
      JSON.stringify(keys),
      "EX",
      PERMS_CACHE_TTL_SECONDS,
    );
    return new Set(keys);
  }
}
