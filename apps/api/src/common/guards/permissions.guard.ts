import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PermissionKey } from "@vero/types";
import type { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService, type AuditInput } from "../audit/audit.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Cache curto das permissions de um papel (evita hit no DB por request).
const PERMS_CACHE_TTL_SECONDS = 300;

interface PermRequest {
  user?: AuthenticatedUser;
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

    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const req = context.switchToHttp().getRequest<PermRequest>();
    const user = req.user;

    // Deny-by-default: rota protegida sem permissão declarada é negada.
    if (!required || required.length === 0) {
      await this.recordDenial(user, req.ip, "rota-sem-permissao-declarada");
      throw new ForbiddenException();
    }
    if (!user) {
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
    user: AuthenticatedUser | undefined,
    ip: string | undefined,
    required: string,
  ): Promise<void> {
    if (!user) return;
    const input: AuditInput = {
      tenantId: user.tenantId,
      action: "AUTHZ_DENIED",
      actorId: user.userId,
      metadata: { required, roleId: user.roleId },
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
