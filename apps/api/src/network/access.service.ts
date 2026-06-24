import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { AuthService, type TokenPair } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Central de acessos multi-unidade (§S45). Um login navega entre as unidades
 * AUTORIZADAS (UserUnit). A troca de unidade revalida a autorização NO SERVIDOR
 * (anti-IDOR): só re-emite a sessão se o usuário estiver atribuído à unidade-alvo;
 * caso contrário, ForbiddenException. SEMPRE tenant-scoped.
 */
@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Unidades às quais o usuário de equipe tem acesso (id + name). */
  async listMyUnits(
    principal: Principal,
  ): Promise<{ id: string; name: string }[]> {
    const staff = assertStaff(principal);
    const rows = await this.prisma.userUnit.findMany({
      where: {
        tenantId: staff.tenantId,
        userId: staff.userId,
        unit: { deletedAt: null },
      },
      select: { unit: { select: { id: true, name: true } } },
      orderBy: { unit: { name: "asc" } },
    });
    return rows.map((r) => r.unit);
  }

  /**
   * Troca a unidade ativa da sessão. Revalida no servidor que o usuário tem acesso
   * à unidade (anti-IDOR) e re-emite o par de tokens com a nova unidade ativa.
   */
  async switchUnit(
    principal: Principal,
    unitId: string,
  ): Promise<TokenPair & { unitId: string }> {
    const staff = assertStaff(principal);

    // Revalidação server-side: o vínculo UserUnit tem que existir no tenant.
    const membership = await this.prisma.userUnit.findFirst({
      where: {
        tenantId: staff.tenantId,
        userId: staff.userId,
        unitId,
        unit: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException();

    const tokens = await this.auth.issueForStaff({
      sub: staff.userId,
      tenantId: staff.tenantId,
      roleId: staff.roleId,
      unitId,
    });
    return { ...tokens, unitId };
  }
}

/** A central de acessos é só de EQUIPE — paciente não tem unidades. */
function assertStaff(
  principal: Principal,
): Extract<Principal, { kind: "staff" }> {
  if (principal.kind !== "staff") throw new ForbiddenException();
  return principal;
}
