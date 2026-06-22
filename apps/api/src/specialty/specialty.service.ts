import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getSpecialtyDefinition, isValidSpecialty } from "@vero/types";
import { AuditService } from "../common/audit/audit.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../record/crypto.service";

/**
 * Fichas por especialidade (§6/S29). Cada ficha é específica da área (Orto,
 * Implanto, Endo, HOF, Alinhadores, Estética); os campos vêm de @vero/types
 * (fonte única, mesma usada no render do web). Valores CIFRADOS em repouso
 * (CryptoService, dado de saúde) e VERSIONADOS (cada save = nova versão; histórico
 * append-only). Tenant-scoped (anti-IDOR); leitura gera SENSITIVE_READ.
 */
@Injectable()
export class SpecialtyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  /** Lê a versão CORRENTE (maior version) da ficha + histórico de versões. AUDITA. */
  async view(
    tenantId: string,
    patientId: string,
    specialty: string,
    actor: { actorId?: string; ip?: string },
  ) {
    this.assertSpecialty(specialty);
    const record = await this.getOrCreateRecord(tenantId, patientId);

    const versions = await this.prisma.specialtyForm.findMany({
      where: { recordId: record.id, specialty },
      orderBy: { version: "desc" },
      select: {
        version: true,
        valuesEnc: true,
        authorId: true,
        createdAt: true,
      },
    });

    await this.audit.record({
      tenantId,
      action: "SENSITIVE_READ",
      ...(actor.actorId ? { actorId: actor.actorId } : {}),
      targetType: "SpecialtyForm",
      targetId: record.id,
      ...(actor.ip ? { ip: actor.ip } : {}),
      metadata: { patientId, specialty },
    });

    const current = versions[0];
    return {
      specialty,
      version: current?.version ?? 0,
      values: current
        ? (JSON.parse(this.crypto.decryptString(current.valuesEnc)) as Record<
            string,
            unknown
          >)
        : {},
      history: versions.map((v) => ({
        version: v.version,
        authorId: v.authorId,
        createdAt: v.createdAt,
      })),
    };
  }

  /** Salva uma NOVA versão da ficha (campos filtrados pela definição). */
  async save(
    tenantId: string,
    patientId: string,
    specialty: string,
    authorId: string,
    values: Record<string, unknown>,
  ) {
    const def = this.assertSpecialty(specialty);
    const record = await this.getOrCreateRecord(tenantId, patientId);

    // Só persiste campos conhecidos da definição (ignora chaves estranhas).
    const allowed = new Set(def.fields.map((f) => f.id));
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (allowed.has(k)) clean[k] = v;
    }

    const last = await this.prisma.specialtyForm.findFirst({
      where: { recordId: record.id, specialty },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;

    await this.prisma.specialtyForm.create({
      data: {
        tenantId,
        recordId: record.id,
        specialty,
        version,
        authorId,
        valuesEnc: this.crypto.encryptString(JSON.stringify(clean)),
      },
      select: { id: true },
    });
    return { specialty, version };
  }

  // --- internos ---

  private assertSpecialty(specialty: string) {
    const def = getSpecialtyDefinition(specialty);
    if (!def || !isValidSpecialty(specialty)) {
      throw new BadRequestException("Especialidade inválida.");
    }
    return def;
  }

  private async getOrCreateRecord(tenantId: string, patientId: string) {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    scope.ensureOwned(patient); // 403 anti-IDOR antes de tocar o prontuário
    return this.prisma.medicalRecord.upsert({
      where: { patientId },
      update: {},
      create: { tenantId, patientId },
      select: { id: true },
    });
  }
}
