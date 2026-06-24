import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const LEAD_SELECT = {
  id: true,
  name: true,
  phone: true,
  leadSourceId: true,
  referredByPatientId: true,
  status: true,
  valueCents: true,
  city: true,
  birthDate: true,
  createdAt: true,
  leadSource: { select: { name: true } },
} satisfies Prisma.CRMLeadSelect;

function ageFrom(birth: Date | null, now: Date): number | null {
  if (!birth) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
function ageBucket(age: number | null): string {
  if (age == null) return "Sem data";
  if (age < 18) return "0-17";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  return "60+";
}

/**
 * CRM (§6/S44): liga marketing a faturamento. Rastreia o lead da origem (canal) ao
 * fechamento (funil NEW→SCHEDULED→CLOSED/LOST), registra indicações (quem indicou
 * quem) e produz relatório de ROI por canal (receita fechada − custo) + demografia
 * (faixa etária, cidade). Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  // --- canais de origem ---

  async createSource(
    tenantId: string,
    input: { name: string; costCents?: number },
  ) {
    return this.prisma.leadChannel.create({
      data: { tenantId, name: input.name, costCents: input.costCents ?? 0 },
      select: { id: true, name: true, costCents: true, active: true },
    });
  }

  async listSources(tenantId: string) {
    return this.prisma.leadChannel.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, costCents: true, active: true },
    });
  }

  // --- leads ---

  async createLead(
    tenantId: string,
    input: {
      name: string;
      phone: string;
      leadSourceId?: string;
      referredByPatientId?: string;
      birthDate?: string;
      city?: string;
    },
  ) {
    const scope = new TenantScope(tenantId);
    if (input.leadSourceId) await this.assertSource(scope, input.leadSourceId);
    if (input.referredByPatientId) {
      await this.assertPatient(scope, input.referredByPatientId);
    }

    const lead = await this.prisma.cRMLead.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone,
        ...(input.leadSourceId ? { leadSourceId: input.leadSourceId } : {}),
        ...(input.referredByPatientId
          ? { referredByPatientId: input.referredByPatientId }
          : {}),
        ...(input.birthDate ? { birthDate: new Date(input.birthDate) } : {}),
        ...(input.city ? { city: input.city } : {}),
        // Indicação → registra um Referral (quem indicou quem).
        ...(input.referredByPatientId
          ? {
              referral: {
                create: {
                  tenantId,
                  referrerPatientId: input.referredByPatientId,
                },
              },
            }
          : {}),
      },
      select: LEAD_SELECT,
    });
    return lead;
  }

  async listLeads(tenantId: string, status?: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.cRMLead.findMany({
      where: scope.where<Prisma.CRMLeadWhereInput>(
        status
          ? {
              status: status as NonNullable<Prisma.CRMLeadWhereInput["status"]>,
            }
          : {},
      ),
      orderBy: { createdAt: "desc" },
      select: LEAD_SELECT,
    });
  }

  /** Move o lead no funil; CLOSED exige o valor fechado. */
  async updateStatus(
    tenantId: string,
    id: string,
    input: { status: string; valueCents?: number },
  ) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.cRMLead.findFirst({
      where: scope.where<Prisma.CRMLeadWhereInput>({ id }),
      select: { id: true },
    });
    scope.ensureOwned(found); // 403 anti-IDOR
    if (
      input.status === "CLOSED" &&
      !(input.valueCents && input.valueCents > 0)
    ) {
      throw new BadRequestException("Informe o valor fechado.");
    }
    return this.prisma.cRMLead.update({
      where: { id },
      data: {
        status: input.status as NonNullable<
          Prisma.CRMLeadUpdateInput["status"]
        >,
        ...(input.status === "CLOSED" && input.valueCents
          ? { valueCents: input.valueCents }
          : {}),
      },
      select: LEAD_SELECT,
    });
  }

  // --- relatórios ---

  /** ROI por canal: leads, fechados, receita e ROI (receita − custo). */
  async reportBySource(tenantId: string) {
    const [sources, grouped, closed] = await Promise.all([
      this.prisma.leadChannel.findMany({
        where: { tenantId },
        select: { id: true, name: true, costCents: true },
      }),
      this.prisma.cRMLead.groupBy({
        by: ["leadSourceId"],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.cRMLead.groupBy({
        by: ["leadSourceId"],
        where: { tenantId, status: "CLOSED" },
        _count: { _all: true },
        _sum: { valueCents: true },
      }),
    ]);

    return sources.map((s) => {
      const leads =
        grouped.find((g) => g.leadSourceId === s.id)?._count._all ?? 0;
      const c = closed.find((g) => g.leadSourceId === s.id);
      const revenueCents = c?._sum.valueCents ?? 0;
      return {
        sourceId: s.id,
        name: s.name,
        costCents: s.costCents,
        leads,
        closed: c?._count._all ?? 0,
        revenueCents,
        roiCents: revenueCents - s.costCents,
      };
    });
  }

  /** Quem indicou quem. */
  async referrals(tenantId: string) {
    const refs = await this.prisma.referral.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        referrer: { select: { name: true } },
        lead: { select: { name: true, status: true } },
      },
    });
    return refs.map((r) => ({
      id: r.id,
      referrerName: r.referrer.name,
      leadName: r.lead.name,
      leadStatus: r.lead.status,
      createdAt: r.createdAt,
    }));
  }

  /** Demografia dos leads: faixa etária + cidade. */
  async demographics(tenantId: string) {
    const leads = await this.prisma.cRMLead.findMany({
      where: { tenantId },
      select: { birthDate: true, city: true },
    });
    const now = new Date();
    const byAge = new Map<string, number>();
    const byCity = new Map<string, number>();
    for (const l of leads) {
      const bucket = ageBucket(ageFrom(l.birthDate, now));
      byAge.set(bucket, (byAge.get(bucket) ?? 0) + 1);
      const city = l.city ?? "Sem cidade";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
    }
    return {
      byAge: [...byAge.entries()].map(([range, count]) => ({ range, count })),
      byCity: [...byCity.entries()].map(([city, count]) => ({ city, count })),
    };
  }

  // --- internos ---

  private async assertSource(scope: TenantScope, sourceId: string) {
    const s = await this.prisma.leadChannel.findFirst({
      where: scope.where<Prisma.LeadChannelWhereInput>({ id: sourceId }),
      select: { id: true },
    });
    if (!s) throw new BadRequestException("Canal inválido.");
  }

  private async assertPatient(scope: TenantScope, patientId: string) {
    const p = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!p) throw new BadRequestException("Paciente indicador inválido.");
  }
}
