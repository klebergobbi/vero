import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Listagens leves de Org/Acesso para popular seletores na agenda (unidade e
 * profissional). SEMPRE tenant-scoped (§4 anti-IDOR) e com campos MÍNIMOS
 * (id + name) — nada de PII como email/hash de senha.
 */
@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  /** Unidades ativas do tenant (id + name). */
  listUnits(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.unit.findMany({
      where: scope.where<Prisma.UnitWhereInput>({ deletedAt: null }),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Profissionais = usuários de equipe ativos do tenant (id + name). Hoje
   * "profissional" é um `User` (§6: modelo Professional dedicado fica p/ depois).
   */
  listProfessionals(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.user.findMany({
      where: scope.where<Prisma.UserWhereInput>({
        deletedAt: null,
        isActive: true,
      }),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
}
