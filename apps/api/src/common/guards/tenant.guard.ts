import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

interface TenantRequest {
  user?: AuthenticatedUser;
  tenantId?: string;
}

/**
 * Garante o contexto de tenant (CLAUDE.md §4). Roda após o JwtAuthGuard:
 * sem `tenantId` no JWT → 401. Injeta `tenantId` na request para uso downstream.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<TenantRequest>();
    if (!req.user?.tenantId) {
      throw new UnauthorizedException();
    }
    req.tenantId = req.user.tenantId;
    return true;
  }
}
