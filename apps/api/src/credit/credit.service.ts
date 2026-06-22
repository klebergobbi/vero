import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { AuditService } from "../common/audit/audit.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import { SPC_QUERY_QUEUE, type SpcJobData } from "./spc-query";

export interface CreateCreditCheckInput {
  patientId: string;
  kind: "QUERY" | "INCLUSION";
  consent: boolean;
  amountCents?: number;
}

/**
 * Crédito (SPC/Serasa — §6/S25): cria a consulta/inclusão (com consentimento/base
 * legal), AUDITA (CREDIT_CHECK/CREDIT_INCLUSION) e enfileira (fila `spc-query`).
 * Tenant-scoped (anti-IDOR §4). Segredos do bureau só no backend (proxy).
 */
@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SPC_QUERY_QUEUE) private readonly queue: Queue<SpcJobData>,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    input: CreateCreditCheckInput,
    actor: { actorId?: string; ip?: string },
  ) {
    if (!input.consent) {
      throw new BadRequestException(
        "Consentimento/base legal obrigatório para consultar/incluir crédito.",
      );
    }
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: input.patientId,
        deletedAt: null,
      }),
      select: { id: true, cpf: true },
    });
    const owned = scope.ensureOwned(patient);
    if (!owned.cpf) {
      throw new BadRequestException("Paciente sem CPF cadastrado.");
    }
    if (
      input.kind === "INCLUSION" &&
      (!input.amountCents || input.amountCents <= 0)
    ) {
      throw new BadRequestException("Informe o valor da dívida para inclusão.");
    }

    const check = await this.prisma.creditCheck.create({
      data: {
        tenantId,
        patientId: input.patientId,
        kind: input.kind,
        consent: true,
        amountCents:
          input.kind === "INCLUSION" ? (input.amountCents ?? null) : null,
      },
    });

    // Auditoria (sem PII): só ids/ação (§4 A09). Toda operação de crédito é registrada.
    await this.audit.record({
      tenantId,
      action: input.kind === "QUERY" ? "CREDIT_CHECK" : "CREDIT_INCLUSION",
      ...(actor.actorId ? { actorId: actor.actorId } : {}),
      targetType: "Patient",
      targetId: input.patientId,
      ...(actor.ip ? { ip: actor.ip } : {}),
      metadata: { creditCheckId: check.id, kind: input.kind },
    });

    await this.queue.add(
      "process",
      { creditCheckId: check.id },
      { jobId: `spc-${check.id}` },
    );
    return check;
  }

  async get(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const check = await this.prisma.creditCheck.findFirst({
      where: scope.where<Prisma.CreditCheckWhereInput>({ id }),
    });
    return scope.ensureOwned(check);
  }
}
