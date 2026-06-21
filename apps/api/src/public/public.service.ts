import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FREEING_STATUSES, normalizeDigits } from "@vero/types";
import {
  computeOpenSlots,
  wallTimeToUtc,
  type OpenSlot,
} from "../appointment/agenda.util";
import { AppointmentService } from "../appointment/appointment.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { OrgService } from "../org/org.service";
import { PrismaService } from "../prisma/prisma.service";
import type { BookDto } from "./dto/book.dto";

const SLOT_MINUTES = 30;
const MIN_LEAD_MS = 60 * 60 * 1000; // antecedência mínima: 1h
const FREEING: string[] = [...FREEING_STATUSES];

interface UnitTz {
  id: string;
  timezone: string;
}

/**
 * Agendamento online PÚBLICO (sem JWT). Resolve o tenant pelo slug e nunca vaza
 * a agenda interna — só devolve SLOTS LIVRES. O booking re-valida o slot
 * (disponibilidade + antecedência + conflito) e reusa o AppointmentService para
 * criar com checagem de conflito (race-safe).
 */
@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentService,
    private readonly org: OrgService,
  ) {}

  /** Unidades da clínica (público, por slug) — para a tela de booking. */
  async listUnits(slug: string) {
    const tenant = await this.resolveTenant(slug);
    return this.org.listUnits(tenant.id);
  }

  /** Profissionais da clínica (público, por slug) — para a tela de booking. */
  async listProfessionals(slug: string) {
    const tenant = await this.resolveTenant(slug);
    return this.org.listProfessionals(tenant.id);
  }

  async listOpenSlots(
    slug: string,
    unitId: string,
    professionalId: string,
    dateYmd: string,
  ): Promise<OpenSlot[]> {
    const tenant = await this.resolveTenant(slug);
    const scope = new TenantScope(tenant.id);
    const unit = await this.findUnit(scope, unitId);
    if (!unit) return []; // unidade de outro tenant/inexistente → sem slots (não vaza)
    const prof = await this.prisma.user.findFirst({
      where: scope.where<Prisma.UserWhereInput>({
        id: professionalId,
        deletedAt: null,
        isActive: true,
      }),
      select: { id: true },
    });
    if (!prof) return [];
    return this.slotsForDate(tenant.id, unit, professionalId, dateYmd);
  }

  async book(slug: string, dto: BookDto) {
    const tenant = await this.resolveTenant(slug);
    const scope = new TenantScope(tenant.id);
    const start = new Date(dto.startsAt);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Horário inválido");
    }
    const unit = await this.findUnit(scope, dto.unitId);
    if (!unit) throw new BadRequestException("Unidade inválida");

    // Re-valida no servidor: o slot escolhido tem que estar entre os LIVRES do
    // dia (disponibilidade + antecedência + sem conflito) — nunca confiar no front.
    const { year, month, day } = this.civilDate(start, unit.timezone);
    const dateYmd = `${year}-${pad(month)}-${pad(day)}`;
    const slots = await this.slotsForDate(
      tenant.id,
      unit,
      dto.professionalId,
      dateYmd,
    );
    const iso = start.toISOString();
    if (!slots.some((s) => s.start === iso)) {
      throw new ConflictException("Horário indisponível");
    }

    const patientId = await this.findOrCreateLead(scope, tenant.id, dto);

    // Cria com re-checagem de conflito (cobre corrida entre listar e reservar) → 409.
    const end = new Date(start.getTime() + SLOT_MINUTES * 60000);
    const appt = await this.appointments.create(tenant.id, {
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

  // --- internos ---

  private async slotsForDate(
    tenantId: string,
    unit: UnitTz,
    professionalId: string,
    dateYmd: string,
  ): Promise<OpenSlot[]> {
    const scope = new TenantScope(tenantId);
    const { year, month, day } = parseYmd(dateYmd);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    const windows = await this.prisma.availability.findMany({
      where: scope.where<Prisma.AvailabilityWhereInput>({
        unitId: unit.id,
        professionalId,
        dayOfWeek,
      }),
      select: { startMinute: true, endMinute: true },
    });
    if (windows.length === 0) return [];

    const dayStart = wallTimeToUtc(year, month, day, 0, unit.timezone);
    const dayEnd = wallTimeToUtc(year, month, day, 24 * 60, unit.timezone);
    const appts = await this.prisma.appointment.findMany({
      where: scope.where<Prisma.AppointmentWhereInput>({
        professionalId,
        deletedAt: null,
        status: { notIn: FREEING as never },
        startsAt: { gte: dayStart, lt: dayEnd },
      }),
      select: { startsAt: true, endsAt: true },
    });

    return computeOpenSlots({
      windows,
      busy: appts.map((a) => ({ start: a.startsAt, end: a.endsAt })),
      year,
      month,
      day,
      timeZone: unit.timezone,
      slotMinutes: SLOT_MINUTES,
      minLeadMs: MIN_LEAD_MS,
      now: new Date(),
    });
  }

  private async resolveTenant(slug: string): Promise<{ id: string }> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException("Clínica não encontrada");
    return tenant;
  }

  private async findUnit(
    scope: TenantScope,
    unitId: string,
  ): Promise<UnitTz | null> {
    return this.prisma.unit.findFirst({
      where: scope.where<Prisma.UnitWhereInput>({
        id: unitId,
        deletedAt: null,
      }),
      select: { id: true, timezone: true },
    });
  }

  /** Reusa o paciente pelo telefone (no tenant) ou cria um lead de SITE. */
  private async findOrCreateLead(
    scope: TenantScope,
    tenantId: string,
    dto: BookDto,
  ): Promise<string> {
    const phone = normalizeDigits(dto.phone);
    const existing = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({ phone, deletedAt: null }),
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.patient.create({
      data: {
        tenantId,
        name: dto.name,
        phone,
        leadSource: "SITE",
        cpf: dto.cpf ? normalizeDigits(dto.cpf) : null,
      },
      select: { id: true },
    });
    return created.id;
  }

  /** Data civil (ano/mês/dia) de um instante NO FUSO informado. */
  private civilDate(instant: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const map: Record<string, string> = {};
    for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
    };
  }
}

function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
