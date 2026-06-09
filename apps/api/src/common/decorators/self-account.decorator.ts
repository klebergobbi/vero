import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import type { Principal } from "../../auth/strategies/jwt.strategy";

/**
 * Marca uma rota como ação na PRÓPRIA conta (ex.: exclusão de conta — §5 loja).
 * A PermissionsGuard libera para QUALQUER principal autenticado (paciente ou
 * equipe), sem checar permission de papel — mas o handler sempre age só sobre o
 * próprio principal (anti-IDOR: nunca recebe um id de alvo do cliente).
 */
export const IS_SELF_ACCOUNT_KEY = "isSelfAccount";
export const SelfAccount = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_SELF_ACCOUNT_KEY, true);

/** Injeta o principal autenticado (posto pela JwtStrategy). Fail-closed se ausente. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const req = ctx.switchToHttp().getRequest<{ user?: Principal }>();
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  },
);
