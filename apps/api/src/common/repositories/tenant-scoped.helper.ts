import { ForbiddenException } from "@nestjs/common";

/**
 * Helper anti-IDOR (CLAUDE.md §4 A01 — risco #1). TODA query de registro do
 * usuário deve passar por aqui: força `tenantId` (e `ownerId` quando aplicável)
 * no `where`, garantindo que um tenant nunca alcance dado de outro.
 *
 * `ensureOwned` nega quando o registro não existe DENTRO do escopo — não distingue
 * "não existe" de "é de outro tenant" (não vaza existência cross-tenant).
 */
export class TenantScope {
  constructor(private readonly tenantId: string) {}

  get id(): string {
    return this.tenantId;
  }

  /** Mescla o filtro de tenant em um `where` do Prisma. */
  where<T extends Record<string, unknown>>(
    extra?: T,
  ): T & { tenantId: string } {
    return { ...(extra ?? ({} as T)), tenantId: this.tenantId };
  }

  /** Filtro tenant + dono do recurso (ex.: paciente vê só as próprias cobranças). */
  ownerWhere<T extends Record<string, unknown>>(
    ownerId: string,
    extra?: T,
    ownerField = "ownerId",
  ): T & { tenantId: string } & Record<string, string> {
    return {
      ...(extra ?? ({} as T)),
      tenantId: this.tenantId,
      [ownerField]: ownerId,
    };
  }

  /** Garante que o registro pertence ao escopo; senão nega (anti-IDOR). */
  ensureOwned<R>(record: R | null | undefined): R {
    if (record === null || record === undefined) {
      throw new ForbiddenException("Recurso inexistente ou fora do seu escopo");
    }
    return record;
  }
}
