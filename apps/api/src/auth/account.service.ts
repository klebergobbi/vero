import { ConflictException, Injectable } from "@nestjs/common";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { AuditService } from "../common/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Exclusão de conta (CLAUDE.md S10 / §5 loja Apple 5.1.1 + Google). SEMPRE age só
 * sobre o próprio principal (anti-IDOR — o id vem do JWT, nunca do cliente):
 * - ANONIMIZA os dados pessoais (PII) e BLOQUEIA login (soft-delete).
 * - Mantém registros operacionais (agendamentos) — a guarda legal do prontuário
 *   (MedicalRecord, S26) será respeitada quando existir.
 * - Audita ACCOUNT_DELETED (sem PII no metadata).
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paciente apaga a própria conta: anonimiza PII + limpa senha + soft-delete. */
  async deletePatient(tenantId: string, patientId: string): Promise<void> {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<{ id: string; deletedAt: null }>({
        id: patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    scope.ensureOwned(patient); // 403 se já removido / fora do escopo

    await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        name: "Paciente removido",
        phone: "",
        cpf: null,
        email: null,
        birthDate: null,
        notes: null,
        passwordHash: null, // bloqueia login (login/refresh filtram passwordHash)
        deletedAt: new Date(),
      },
    });

    await this.audit.record({
      tenantId,
      action: "ACCOUNT_DELETED",
      actorId: patientId,
      targetType: "Patient",
      targetId: patientId,
      metadata: { kind: "patient" },
    });
  }

  /** Profissional/equipe apaga a própria conta: anonimiza + desativa + soft-delete. */
  async deleteStaff(tenantId: string, userId: string): Promise<void> {
    const scope = new TenantScope(tenantId);
    const user = await this.prisma.user.findFirst({
      where: scope.where<{ id: string; deletedAt: null }>({
        id: userId,
        deletedAt: null,
      }),
      select: { id: true, role: { select: { key: true } } },
    });
    const owned = scope.ensureOwned(user); // 403 se já removido / fora do escopo

    // Evita travar o tenant: não deixa excluir o ÚLTIMO gestor ativo.
    if (owned.role.key === "GESTOR") {
      const activeGestores = await this.prisma.user.count({
        where: scope.where<{
          deletedAt: null;
          isActive: true;
          role: { key: string };
        }>({ deletedAt: null, isActive: true, role: { key: "GESTOR" } }),
      });
      if (activeGestores <= 1) {
        throw new ConflictException(
          "Não é possível excluir o último gestor ativo da clínica.",
        );
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: "Usuário removido",
        email: `removido+${userId}@vero.invalid`, // mantém único por tenant
        passwordHash: "REMOVED", // sentinela não-verificável; login filtra isActive/deletedAt antes
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await this.audit.record({
      tenantId,
      action: "ACCOUNT_DELETED",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      metadata: { kind: "staff" },
    });
  }
}
