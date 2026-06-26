import { ForbiddenException, Injectable } from "@nestjs/common";
import { AppointmentService } from "../appointment/appointment.service";
import type { CreateAppointmentDto } from "../appointment/dto/create-appointment.dto";
import { PrismaService } from "../prisma/prisma.service";

const CENTRAL_SELECT = {
  id: true,
  unitId: true,
  unit: { select: { name: true } },
  professionalId: true,
  professional: { select: { name: true } },
  patientId: true,
  patient: { select: { name: true, phone: true } },
  startsAt: true,
  endsAt: true,
  status: true,
  markers: true,
  notes: true,
} as const;

/**
 * Central de agendamentos multi-unidade (S48).
 * O operador agenda em qualquer unidade AUTORIZADA (UserUnit) a partir de um
 * único ponto — sem precisar trocar a unidade ativa. Anti-IDOR: só expõe e
 * cria em unidades cujo UserUnit existe para o operador neste tenant.
 */
@Injectable()
export class SchedulingCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentService,
  ) {}

  /**
   * Retorna os agendamentos de TODAS as unidades autorizadas para o operador.
   * Suporta filtro por data (from/to) e por unidade (unitId, se autorizada).
   */
  async getConsolidated(
    tenantId: string,
    userId: string,
    query: { from?: string; to?: string; unitId?: string },
  ) {
    const authorizedUnitIds = await this.resolveAuthorizedUnits(
      tenantId,
      userId,
    );
    if (authorizedUnitIds.length === 0) return [];

    // Se um unitId foi solicitado, valida que está entre os autorizados.
    const targetUnits =
      query.unitId && authorizedUnitIds.includes(query.unitId)
        ? [query.unitId]
        : query.unitId
          ? [] // unitId solicitado não é autorizado — retorna vazio (não 403; a lista global segue ok)
          : authorizedUnitIds;

    if (targetUnits.length === 0) return [];

    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        unitId: { in: targetUnits },
        ...(query.from || query.to
          ? {
              startsAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ unitId: "asc" }, { startsAt: "asc" }],
      take: 500,
      select: CENTRAL_SELECT,
    });
  }

  /**
   * Cria um agendamento numa unidade autorizada, roteando via AppointmentService
   * (reusa toda a lógica de conflito, disponibilidade e anti-IDOR).
   * Anti-IDOR extra: valida o UserUnit antes de delegar.
   */
  async book(tenantId: string, userId: string, dto: CreateAppointmentDto) {
    const membership = await this.prisma.userUnit.findFirst({
      where: {
        tenantId,
        userId,
        unitId: dto.unitId,
        unit: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException("Sem acesso à unidade selecionada");
    }

    return this.appointments.create(tenantId, dto);
  }

  /** Lista as unidades às quais o operador tem acesso (para o seletor no form). */
  async listAuthorizedUnits(tenantId: string, userId: string) {
    const links = await this.prisma.userUnit.findMany({
      where: { tenantId, userId, unit: { deletedAt: null } },
      select: { unit: { select: { id: true, name: true } } },
      orderBy: { unit: { name: "asc" } },
    });
    return links.map((l) => l.unit);
  }

  private async resolveAuthorizedUnits(
    tenantId: string,
    userId: string,
  ): Promise<string[]> {
    const links = await this.prisma.userUnit.findMany({
      where: { tenantId, userId, unit: { deletedAt: null } },
      select: { unitId: true },
    });
    return links.map((l) => l.unitId);
  }
}

export type CentralAppointmentRow = Awaited<
  ReturnType<SchedulingCenterService["getConsolidated"]>
>[number];

export type CentralUnitOption = Awaited<
  ReturnType<SchedulingCenterService["listAuthorizedUnits"]>
>[number];
