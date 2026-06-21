import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FREEING_STATUSES } from "@vero/types";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import { localDayAndMinute } from "./agenda.util";
import type { CreateAppointmentDto } from "./dto/create-appointment.dto";
import type { CreateAvailabilityDto } from "./dto/create-availability.dto";
import type { ListAppointmentsDto } from "./dto/list-appointments.dto";
import type { MoveAppointmentDto } from "./dto/move-appointment.dto";

interface ConflictArgs {
  professionalId: string;
  roomId?: string | null;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
}

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateAppointmentDto) {
    const scope = new TenantScope(tenantId);
    const unit = await this.assertUnit(scope, dto.unitId);
    await this.assertProfessional(scope, dto.professionalId);
    await this.assertPatient(scope, dto.patientId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertRange(startsAt, endsAt);
    await this.assertWithinAvailability(
      scope,
      unit,
      dto.professionalId,
      startsAt,
      endsAt,
    );
    await this.assertNoConflict(scope, {
      professionalId: dto.professionalId,
      roomId: dto.roomId ?? null,
      startsAt,
      endsAt,
    });

    const data: Prisma.AppointmentUncheckedCreateInput = {
      tenantId,
      unitId: dto.unitId,
      professionalId: dto.professionalId,
      patientId: dto.patientId,
      roomId: dto.roomId ?? null,
      startsAt,
      endsAt,
      status: dto.status ?? "SCHEDULED",
      markers: dto.markers ?? [],
      notes: dto.notes ?? null,
    };
    return this.prisma.appointment.create({ data });
  }

  async findAll(tenantId: string, query: ListAppointmentsDto) {
    const scope = new TenantScope(tenantId);
    const where = scope.where<Prisma.AppointmentWhereInput>({
      deletedAt: null,
    });
    if (query.professionalId) where.professionalId = query.professionalId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return this.prisma.appointment.findMany({
      where,
      orderBy: { startsAt: "asc" },
      take: 200,
    });
  }

  async findOne(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const appointment = await this.prisma.appointment.findFirst({
      where: scope.where<Prisma.AppointmentWhereInput>({ id, deletedAt: null }),
    });
    return scope.ensureOwned(appointment); // 403 cross-tenant
  }

  async move(tenantId: string, id: string, dto: MoveAppointmentDto) {
    const scope = new TenantScope(tenantId);
    const existing = await this.findOne(tenantId, id); // posse (anti-IDOR)

    const professionalId = dto.professionalId ?? existing.professionalId;
    const roomId = dto.roomId !== undefined ? dto.roomId : existing.roomId;
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertRange(startsAt, endsAt);

    if (dto.professionalId)
      await this.assertProfessional(scope, professionalId);
    const unit = await this.assertUnit(scope, existing.unitId);
    await this.assertWithinAvailability(
      scope,
      unit,
      professionalId,
      startsAt,
      endsAt,
    );
    await this.assertNoConflict(scope, {
      professionalId,
      roomId,
      startsAt,
      endsAt,
      excludeId: id, // não conflita consigo mesmo
    });

    const data: Prisma.AppointmentUncheckedUpdateInput = {
      professionalId,
      roomId,
      startsAt,
      endsAt,
    };
    return this.prisma.appointment.update({ where: { id }, data });
  }

  async cancel(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // posse
    return this.prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  async createAvailability(tenantId: string, dto: CreateAvailabilityDto) {
    const scope = new TenantScope(tenantId);
    await this.assertUnit(scope, dto.unitId);
    await this.assertProfessional(scope, dto.professionalId);
    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException("startMinute deve ser menor que endMinute");
    }
    const data: Prisma.AvailabilityUncheckedCreateInput = {
      tenantId,
      unitId: dto.unitId,
      professionalId: dto.professionalId,
      dayOfWeek: dto.dayOfWeek,
      startMinute: dto.startMinute,
      endMinute: dto.endMinute,
    };
    return this.prisma.availability.create({ data });
  }

  async listAvailability(
    tenantId: string,
    unitId?: string,
    professionalId?: string,
  ) {
    const scope = new TenantScope(tenantId);
    const where = scope.where<Prisma.AvailabilityWhereInput>({});
    if (unitId) where.unitId = unitId;
    if (professionalId) where.professionalId = professionalId;
    return this.prisma.availability.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });
  }

  /**
   * Fila de espera do tenant (S14) — pacientes que fizeram self check-in e
   * aguardam atendimento. A recepção vê isto na agenda web. Tenant-scoped.
   */
  async listWaitList(tenantId: string, unitId?: string) {
    const scope = new TenantScope(tenantId);
    const where = scope.where<Prisma.WaitListWhereInput>({ status: "WAITING" });
    if (unitId) where.unitId = unitId;
    return this.prisma.waitList.findMany({
      where,
      orderBy: { arrivedAt: "asc" },
      take: 100,
    });
  }

  // --- regras (privadas) ---

  private assertRange(startsAt: Date, endsAt: Date): void {
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      startsAt >= endsAt
    ) {
      throw new BadRequestException("Intervalo inválido (startsAt < endsAt)");
    }
  }

  /** Conflito por profissional e, se houver, por sala (overlap de instantes). 409. */
  private async assertNoConflict(
    scope: TenantScope,
    args: ConflictArgs,
  ): Promise<void> {
    const base: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      status: { notIn: [...FREEING_STATUSES] },
      startsAt: { lt: args.endsAt },
      endsAt: { gt: args.startsAt },
    };
    if (args.excludeId) base.id = { not: args.excludeId };

    const professionalClash = await this.prisma.appointment.findFirst({
      where: scope.where<Prisma.AppointmentWhereInput>({
        ...base,
        professionalId: args.professionalId,
      }),
      select: { id: true },
    });
    if (professionalClash) {
      throw new ConflictException(
        "Profissional já tem agendamento nesse horário",
      );
    }

    if (args.roomId) {
      const roomClash = await this.prisma.appointment.findFirst({
        where: scope.where<Prisma.AppointmentWhereInput>({
          ...base,
          roomId: args.roomId,
        }),
        select: { id: true },
      });
      if (roomClash) {
        throw new ConflictException("Sala já ocupada nesse horário");
      }
    }
  }

  /** Se houver disponibilidade definida para o dia, o agendamento deve caber numa janela. */
  private async assertWithinAvailability(
    scope: TenantScope,
    unit: { id: string; timezone: string },
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> {
    const start = localDayAndMinute(startsAt, unit.timezone);
    const end = localDayAndMinute(endsAt, unit.timezone);
    const windows = await this.prisma.availability.findMany({
      where: scope.where<Prisma.AvailabilityWhereInput>({
        unitId: unit.id,
        professionalId,
        dayOfWeek: start.dayOfWeek,
      }),
      select: { startMinute: true, endMinute: true },
    });
    if (windows.length === 0) return; // sem regra → não bloqueia (enforce-if-defined)

    const fits = windows.some(
      (w) => start.minute >= w.startMinute && end.minute <= w.endMinute,
    );
    if (!fits) {
      throw new BadRequestException("Fora da disponibilidade do profissional");
    }
  }

  private async assertUnit(
    scope: TenantScope,
    unitId: string,
  ): Promise<{ id: string; timezone: string }> {
    const unit = await this.prisma.unit.findFirst({
      where: scope.where<Prisma.UnitWhereInput>({
        id: unitId,
        deletedAt: null,
      }),
      select: { id: true, timezone: true },
    });
    if (!unit) throw new BadRequestException("Unidade inválida");
    return unit;
  }

  private async assertProfessional(
    scope: TenantScope,
    professionalId: string,
  ): Promise<void> {
    const professional = await this.prisma.user.findFirst({
      where: scope.where<Prisma.UserWhereInput>({
        id: professionalId,
        deletedAt: null,
        isActive: true,
      }),
      select: { id: true },
    });
    if (!professional) throw new BadRequestException("Profissional inválido");
  }

  private async assertPatient(
    scope: TenantScope,
    patientId: string,
  ): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!patient) throw new BadRequestException("Paciente inválido");
  }
}
