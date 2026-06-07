import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuditAction } from "@vero/types";
import { PrismaService } from "../../prisma/prisma.service";

/** Entrada de auditoria. NUNCA inclua PII em `metadata` (CLAUDE.md §4 A09). */
export interface AuditInput {
  tenantId: string;
  action: AuditAction;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra eventos de segurança no AuditLog (AUTHZ_DENIED, SENSITIVE_READ,
 * PERMISSION_CHANGED, login...). Falha de auditoria nunca derruba a request
 * principal (loga e segue) — mas a decisão de acesso já foi tomada fail-closed.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      tenantId: input.tenantId,
      action: input.action,
      actorId: input.actorId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ip: input.ip ?? null,
    };
    if (input.metadata !== undefined) {
      data.metadata = input.metadata as Prisma.InputJsonValue;
    }

    try {
      await this.prisma.auditLog.create({ data });
    } catch (err) {
      this.logger.error(
        `Falha ao gravar AuditLog (${input.action}): ${(err as Error).message}`,
      );
    }
  }
}
