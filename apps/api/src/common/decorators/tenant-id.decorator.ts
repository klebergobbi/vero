import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

interface ScopedRequest {
  tenantId?: string;
  user?: { tenantId?: string };
}

/**
 * Injeta o `tenantId` da request (posto pelo TenantGuard a partir do JWT).
 * Fail-closed: sem tenant → 401. Use em handlers para escopar queries (§4 anti-IDOR).
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<ScopedRequest>();
    const tenantId = req.tenantId ?? req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return tenantId;
  },
);
