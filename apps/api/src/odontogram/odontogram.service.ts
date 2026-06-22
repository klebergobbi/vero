import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../common/audit/audit.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

export interface SetConditionInput {
  toothNumber: number;
  face: string;
  condition: string;
}

/**
 * Odontograma (§6/S27): mapa dental vinculado ao prontuário. Tenant-scoped
 * (anti-IDOR: valida posse do paciente antes de tocar). Por ser dado clínico, a
 * visualização gera SENSITIVE_READ no AuditLog (§4). `condition === HEALTHY`
 * remove o registro (saudável é o estado padrão).
 */
@Injectable()
export class OdontogramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async view(
    tenantId: string,
    patientId: string,
    actor: { actorId?: string; ip?: string },
  ) {
    const odontogram = await this.getOrCreate(tenantId, patientId);
    const conditions = await this.listConditions(odontogram.id);

    await this.audit.record({
      tenantId,
      action: "SENSITIVE_READ",
      ...(actor.actorId ? { actorId: actor.actorId } : {}),
      targetType: "Odontogram",
      targetId: odontogram.id,
      ...(actor.ip ? { ip: actor.ip } : {}),
      metadata: { patientId },
    });

    return { id: odontogram.id, conditions };
  }

  /** Define (upsert) ou limpa (HEALTHY → delete) a condição de um dente/face. */
  async setCondition(
    tenantId: string,
    patientId: string,
    input: SetConditionInput,
  ) {
    const odontogram = await this.getOrCreate(tenantId, patientId);

    if (input.condition === "HEALTHY") {
      await this.prisma.toothCondition.deleteMany({
        where: {
          odontogramId: odontogram.id,
          toothNumber: input.toothNumber,
          face: input.face,
        },
      });
    } else {
      await this.prisma.toothCondition.upsert({
        where: {
          odontogramId_toothNumber_face: {
            odontogramId: odontogram.id,
            toothNumber: input.toothNumber,
            face: input.face,
          },
        },
        update: { condition: input.condition },
        create: {
          tenantId,
          odontogramId: odontogram.id,
          toothNumber: input.toothNumber,
          face: input.face,
          condition: input.condition,
        },
      });
    }
    return {
      id: odontogram.id,
      conditions: await this.listConditions(odontogram.id),
    };
  }

  private listConditions(odontogramId: string) {
    return this.prisma.toothCondition.findMany({
      where: { odontogramId },
      orderBy: [{ toothNumber: "asc" }, { face: "asc" }],
      select: { toothNumber: true, face: true, condition: true },
    });
  }

  /** Resolve o odontograma do paciente (anti-IDOR) criando prontuário+mapa se preciso. */
  private async getOrCreate(tenantId: string, patientId: string) {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    scope.ensureOwned(patient); // 403 antes de tocar o prontuário

    const record = await this.prisma.medicalRecord.upsert({
      where: { patientId },
      update: {},
      create: { tenantId, patientId },
      select: { id: true },
    });
    return this.prisma.odontogram.upsert({
      where: { recordId: record.id },
      update: {},
      create: { tenantId, recordId: record.id },
      select: { id: true },
    });
  }
}
