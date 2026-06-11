import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

// Status em que NÃO faz sentido confirmar presença (terminais/cancelados).
const NON_CONFIRMABLE = ["CANCELLED", "NO_SHOW", "COMPLETED"];

export interface ConfirmResult {
  id: string;
  status: string;
  alreadyConfirmed: boolean;
}

/**
 * Leituras/ações do App do Paciente (CLAUDE.md S8b/S11). TODA query é OWNER-scoped
 * via `TenantScope.ownerWhere` (tenantId + patientId) — anti-IDOR: o paciente só
 * alcança os próprios dados, nunca os de outro (§4 A01).
 */
@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  myAppointments(tenantId: string, patientId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.appointment.findMany({
      where: scope.ownerWhere<Prisma.AppointmentWhereInput>(
        patientId,
        { deletedAt: null },
        "patientId",
      ),
      orderBy: { startsAt: "asc" },
      take: 200,
    });
  }

  /**
   * Confirma presença na consulta do paciente (S11). IDEMPOTENTE: confirmar 2x não
   * duplica o ConfirmationEvent (já CONFIRMED → no-op). Anti-IDOR via owner.
   * `source` registra a origem (PATIENT_APP no app; WHATSAPP no webhook da S12b).
   */
  async confirmAppointment(
    tenantId: string,
    patientId: string,
    appointmentId: string,
    source = "PATIENT_APP",
  ): Promise<ConfirmResult> {
    const scope = new TenantScope(tenantId);
    const appt = await this.prisma.appointment.findFirst({
      where: scope.ownerWhere<Prisma.AppointmentWhereInput>(
        patientId,
        { id: appointmentId, deletedAt: null },
        "patientId",
      ),
      select: { id: true, status: true },
    });
    const owned = scope.ensureOwned(appt); // 403 se não for do paciente

    if (owned.status === "CONFIRMED") {
      return { id: owned.id, status: owned.status, alreadyConfirmed: true };
    }
    if (NON_CONFIRMABLE.includes(owned.status)) {
      throw new ConflictException("Não é possível confirmar esta consulta.");
    }

    // Transação: muda o status e registra o evento de histórico atomicamente.
    const [updated] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CONFIRMED" },
        select: { id: true, status: true },
      }),
      this.prisma.confirmationEvent.create({
        data: { tenantId, appointmentId, patientId, source },
      }),
    ]);
    return { id: updated.id, status: updated.status, alreadyConfirmed: false };
  }
}
