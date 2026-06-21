import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FREEING_STATUSES } from "@vero/types";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import { computeOpenSlots, wallTimeToUtc, type OpenSlot } from "./agenda.util";

const SLOT_MINUTES = 30;
const MIN_LEAD_MS = 60 * 60 * 1000; // antecedência mínima: 1h
const FREEING: string[] = [...FREEING_STATUSES];

export const SLOT_DURATION_MINUTES = SLOT_MINUTES;

/**
 * Cálculo de slots LIVRES (S15) — fonte ÚNICA usada tanto pelo agendamento online
 * público (PublicService) quanto pelo app do paciente logado (MeService). Sempre
 * tenant-scoped; nunca devolve a agenda interna, só os horários livres.
 */
@Injectable()
export class SlotService {
  constructor(private readonly prisma: PrismaService) {}

  async openSlots(
    tenantId: string,
    unitId: string,
    professionalId: string,
    dateYmd: string,
  ): Promise<OpenSlot[]> {
    const scope = new TenantScope(tenantId);
    const unit = await this.prisma.unit.findFirst({
      where: scope.where<Prisma.UnitWhereInput>({
        id: unitId,
        deletedAt: null,
      }),
      select: { id: true, timezone: true },
    });
    if (!unit) return [];

    const { year, month, day } = parseYmd(dateYmd);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    const windows = await this.prisma.availability.findMany({
      where: scope.where<Prisma.AvailabilityWhereInput>({
        unitId,
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

  /** Data civil (ano/mês/dia) de um instante NO FUSO da unidade (para re-validar). */
  async dateYmdInUnitTz(
    tenantId: string,
    unitId: string,
    instant: Date,
  ): Promise<string | null> {
    const scope = new TenantScope(tenantId);
    const unit = await this.prisma.unit.findFirst({
      where: scope.where<Prisma.UnitWhereInput>({
        id: unitId,
        deletedAt: null,
      }),
      select: { timezone: true },
    });
    if (!unit) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: unit.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const map: Record<string, string> = {};
    for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
    return `${map.year}-${map.month}-${map.day}`;
  }
}

function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}
