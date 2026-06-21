import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppointmentService } from "../appointment/appointment.service";
import {
  SLOT_DURATION_MINUTES,
  SlotService,
} from "../appointment/slot.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { OrgService } from "../org/org.service";
import { PrismaService } from "../prisma/prisma.service";
import type { MeBookDto } from "./dto/book.dto";

// Status em que NÃO faz sentido confirmar presença (terminais/cancelados).
const NON_CONFIRMABLE = ["CANCELLED", "NO_SHOW", "COMPLETED"];
// Self check-in só faz sentido antes do atendimento começar.
const CHECKABLE = ["SCHEDULED", "CONFIRMED"];

export interface ConfirmResult {
  id: string;
  status: string;
  alreadyConfirmed: boolean;
}

export interface CheckInResult {
  id: string;
  status: string;
  alreadyCheckedIn: boolean;
}

/**
 * Leituras/ações do App do Paciente (CLAUDE.md S8b/S11). TODA query é OWNER-scoped
 * via `TenantScope.ownerWhere` (tenantId + patientId) — anti-IDOR: o paciente só
 * alcança os próprios dados, nunca os de outro (§4 A01).
 */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotService,
    private readonly appointments: AppointmentService,
    private readonly org: OrgService,
  ) {}

  /** Unidades da clínica do paciente (para escolher ao agendar — §S15c). */
  myUnits(tenantId: string) {
    return this.org.listUnits(tenantId);
  }

  /** Profissionais da clínica do paciente (para escolher ao agendar — §S15c). */
  myProfessionals(tenantId: string) {
    return this.org.listProfessionals(tenantId);
  }

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

  /**
   * Self check-in: o paciente avisa que chegou (S14). IDEMPOTENTE — fazer 2x não
   * duplica a entrada na fila (já CHECKED_IN → no-op; o `@unique` em
   * `appointmentId` é a barreira no banco). Anti-IDOR via owner. Coloca o
   * agendamento em CHECKED_IN e cria/reativa a entrada WAITING na WaitList, que a
   * recepção vê na agenda web.
   * Obs.: janela/raio de check-in é opcional (§S14) e não é imposto por ora.
   */
  async checkIn(
    tenantId: string,
    patientId: string,
    appointmentId: string,
  ): Promise<CheckInResult> {
    const scope = new TenantScope(tenantId);
    const appt = await this.prisma.appointment.findFirst({
      where: scope.ownerWhere<Prisma.AppointmentWhereInput>(
        patientId,
        { id: appointmentId, deletedAt: null },
        "patientId",
      ),
      select: { id: true, status: true, unitId: true },
    });
    const owned = scope.ensureOwned(appt); // 403 se não for do paciente

    if (owned.status === "CHECKED_IN") {
      return { id: owned.id, status: owned.status, alreadyCheckedIn: true };
    }
    if (!CHECKABLE.includes(owned.status)) {
      throw new ConflictException(
        "Não é possível fazer check-in desta consulta.",
      );
    }

    // Transação: muda o status e registra a chegada na fila atomicamente.
    // upsert por appointmentId (único) blinda contra corrida → nunca duplica.
    const [updated] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CHECKED_IN" },
        select: { id: true, status: true },
      }),
      this.prisma.waitList.upsert({
        where: { appointmentId },
        create: {
          tenantId,
          appointmentId,
          patientId,
          unitId: owned.unitId,
          status: "WAITING",
        },
        update: { status: "WAITING", arrivedAt: new Date() },
      }),
    ]);
    return { id: updated.id, status: updated.status, alreadyCheckedIn: false };
  }

  /** Slots livres para o paciente logado escolher (§S15c). Tenant do JWT. */
  mySlots(
    tenantId: string,
    unitId: string,
    professionalId: string,
    date: string,
  ) {
    return this.slots.openSlots(tenantId, unitId, professionalId, date);
  }

  /**
   * Agendamento online do paciente LOGADO (§S15c): reserva um slot livre com o
   * PRÓPRIO patientId (não cria lead). Re-valida o slot no servidor e reusa o
   * AppointmentService (conflito race-safe → 409).
   */
  async book(tenantId: string, patientId: string, dto: MeBookDto) {
    const start = new Date(dto.startsAt);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Horário inválido");
    }
    const dateYmd = await this.slots.dateYmdInUnitTz(
      tenantId,
      dto.unitId,
      start,
    );
    if (!dateYmd) throw new BadRequestException("Unidade inválida");

    const slots = await this.slots.openSlots(
      tenantId,
      dto.unitId,
      dto.professionalId,
      dateYmd,
    );
    const iso = start.toISOString();
    if (!slots.some((s) => s.start === iso)) {
      throw new ConflictException("Horário indisponível");
    }

    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60000);
    const appt = await this.appointments.create(tenantId, {
      unitId: dto.unitId,
      professionalId: dto.professionalId,
      patientId,
      startsAt: iso,
      endsAt: end.toISOString(),
    });
    return {
      appointmentId: appt.id,
      startsAt: appt.startsAt,
      status: appt.status,
    };
  }
}
