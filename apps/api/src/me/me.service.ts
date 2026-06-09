import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Leituras do App do Paciente (CLAUDE.md S8b). TODA query é OWNER-scoped via
 * `TenantScope.ownerWhere` (tenantId + patientId) — anti-IDOR: o paciente só
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
}
