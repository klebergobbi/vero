import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Principal } from "../../auth/strategies/jwt.strategy";

/**
 * Injeta a unidade ATIVA da sessão de equipe (§S45), posta no JWT pela troca de
 * unidade. Pode ser `undefined` (usuário sem unidade atribuída / principal de
 * paciente). Use para escopar queries por unidade (tenant+unit scoped) onde a
 * dimensão de unidade importa.
 */
export const ActiveUnitId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: Principal }>();
    const user = req.user;
    return user?.kind === "staff" ? user.unitId : undefined;
  },
);
