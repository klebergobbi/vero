import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { EsignService } from "../integrations/esign/esign.service";
import { PrismaService } from "../prisma/prisma.service";

export interface SignInput {
  ip: string;
  userAgent?: string;
  signerName?: string;
}

/**
 * Contratos (§6/S18): gera documento imutável a partir de um orçamento APROVADO,
 * o paciente assina (evidência IP+timestamp+hash) e a integridade é verificável.
 * Tenant-scoped (anti-IDOR §4). Imutável após assinado.
 */
@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly esign: EsignService,
  ) {}

  /** Gera o contrato de um orçamento aprovado (1 por orçamento). */
  async generate(tenantId: string, budgetId: string) {
    const scope = new TenantScope(tenantId);
    const budget = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({
        id: budgetId,
        deletedAt: null,
      }),
      include: {
        patient: { select: { name: true } },
        plan: { select: { name: true } },
        items: true,
        contract: { select: { id: true } },
      },
    });
    const owned = scope.ensureOwned(budget);
    if (owned.status !== "APPROVED") {
      throw new BadRequestException(
        "O orçamento precisa estar aprovado para gerar o contrato.",
      );
    }
    if (owned.contract) {
      throw new ConflictException("Este orçamento já tem contrato.");
    }

    const body = this.esign.buildContractBody({
      patientName: owned.patient.name,
      planName: owned.plan?.name ?? null,
      items: owned.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
      })),
      totalCents: owned.totalCents,
    });
    return this.prisma.contract.create({
      data: {
        tenantId,
        budgetId,
        patientId: owned.patientId,
        body,
        contentHash: this.esign.contentHash(body),
      },
    });
  }

  getOne(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    return this.findOwned(scope, { id });
  }

  async verify(tenantId: string, id: string) {
    const contract = await this.getOne(tenantId, id);
    return this.esign.verify(
      contract.body,
      contract.contentHash,
      contract.signatures,
    );
  }

  // --- paciente (owner-scoped) ---

  listForPatient(tenantId: string, patientId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.contract.findMany({
      where: scope.where<Prisma.ContractWhereInput>({
        patientId,
        deletedAt: null,
      }),
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, signedAt: true },
    });
  }

  getForPatient(tenantId: string, patientId: string, id: string) {
    const scope = new TenantScope(tenantId);
    return this.findOwned(scope, { id, patientId });
  }

  async sign(
    tenantId: string,
    patientId: string,
    id: string,
    input: SignInput,
  ) {
    const scope = new TenantScope(tenantId);
    const contract = await this.findOwned(scope, { id, patientId });
    if (contract.status !== "DRAFT") {
      throw new ConflictException("Contrato já assinado ou cancelado.");
    }

    const evidence = this.esign.buildEvidence({
      contentHash: contract.contentHash,
      signerName: input.signerName?.trim() || "Paciente",
      ip: input.ip,
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    });

    await this.prisma.$transaction([
      this.prisma.signature.create({
        data: { tenantId, contractId: id, ...evidence },
      }),
      this.prisma.contract.update({
        where: { id },
        data: { status: "SIGNED", signedAt: new Date() },
      }),
    ]);
    return this.getForPatient(tenantId, patientId, id);
  }

  // --- interno ---

  private async findOwned(
    scope: TenantScope,
    where: { id: string; patientId?: string },
  ) {
    const filter: Prisma.ContractWhereInput = { id: where.id, deletedAt: null };
    if (where.patientId) filter.patientId = where.patientId;
    const contract = await this.prisma.contract.findFirst({
      where: scope.where<Prisma.ContractWhereInput>(filter),
      include: { signatures: { orderBy: { signedAt: "asc" } } },
    });
    return scope.ensureOwned(contract);
  }
}
