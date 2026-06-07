import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { normalizeDigits } from "@vero/types";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import type { CreatePatientDto } from "./dto/create-patient.dto";
import type { UpdatePatientDto } from "./dto/update-patient.dto";

/**
 * CRUD de paciente SEMPRE tenant-scoped (CLAUDE.md §4 anti-IDOR). Toda query passa
 * pelo TenantScope; `ensureOwned` nega acesso a recurso de outro tenant (403).
 */
@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePatientDto) {
    const scope = new TenantScope(tenantId);
    await this.assertReferrer(scope, dto.referredById);

    const data: Prisma.PatientUncheckedCreateInput = {
      tenantId,
      name: dto.name,
      phone: normalizeDigits(dto.phone),
      leadSource: dto.leadSource,
      cpf: dto.cpf ? normalizeDigits(dto.cpf) : null,
      email: dto.email ?? null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      referredById: dto.referredById ?? null,
      notes: dto.notes ?? null,
    };
    return this.prisma.patient.create({ data });
  }

  async findAll(tenantId: string, q?: string) {
    const scope = new TenantScope(tenantId);
    const where = scope.where<Prisma.PatientWhereInput>({ deletedAt: null });
    if (q && q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: "insensitive" } },
        { phone: { contains: normalizeDigits(q) } },
      ];
    }
    return this.prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findOne(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({ id, deletedAt: null }),
    });
    // 403 se inexistente ou de outro tenant (não vaza existência cross-tenant).
    return scope.ensureOwned(patient);
  }

  async update(tenantId: string, id: string, dto: UpdatePatientDto) {
    const scope = new TenantScope(tenantId);
    await this.findOne(tenantId, id); // garante posse (anti-IDOR) antes de alterar
    await this.assertReferrer(scope, dto.referredById);

    const data: Prisma.PatientUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = normalizeDigits(dto.phone);
    if (dto.leadSource !== undefined) data.leadSource = dto.leadSource;
    if (dto.cpf !== undefined)
      data.cpf = dto.cpf ? normalizeDigits(dto.cpf) : null;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }
    if (dto.referredById !== undefined) data.referredById = dto.referredById;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.patient.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id); // garante posse
    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() }, // soft-delete
    });
  }

  /** Se houver indicador, ele precisa existir DENTRO do mesmo tenant (anti-IDOR + integridade). */
  private async assertReferrer(
    scope: TenantScope,
    referredById?: string,
  ): Promise<void> {
    if (!referredById) return;
    const ref = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: referredById,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!ref) throw new BadRequestException("Paciente indicador inválido");
  }
}
