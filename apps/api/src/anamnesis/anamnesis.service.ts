import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../common/audit/audit.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { EsignService } from "../integrations/esign/esign.service";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../record/crypto.service";

const FILL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface TemplateQuestion {
  id: string;
  label: string;
}

/**
 * Anamnese digital (§6/S28). Modelos reutilizáveis (`AnamnesisTemplate`) e
 * instâncias enviadas ao paciente, preenchidas/assinadas REMOTAMENTE por link de
 * USO ÚNICO (token opaco; só o hash fica no banco; expira). Respostas CIFRADAS em
 * repouso (CryptoService, dado de saúde). Evidência de assinatura reusa o esign da
 * S18 (hash SHA-256 tamper-evident + IP + timestamp). Tudo tenant-scoped (anti-IDOR);
 * a leitura pela equipe gera SENSITIVE_READ. O preenchimento público resolve a
 * anamnese SÓ pelo token (capability) — nunca por id vindo do cliente.
 */
@Injectable()
export class AnamnesisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly esign: EsignService,
    private readonly audit: AuditService,
  ) {}

  // --- templates (equipe) ---

  async createTemplate(
    tenantId: string,
    input: {
      name: string;
      procedureKey?: string;
      questions: TemplateQuestion[];
    },
  ) {
    return this.prisma.anamnesisTemplate.create({
      data: {
        tenantId,
        name: input.name,
        procedureKey: input.procedureKey ?? null,
        questions: input.questions as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        procedureKey: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async listTemplates(tenantId: string) {
    return this.prisma.anamnesisTemplate.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        procedureKey: true,
        questions: true,
        createdAt: true,
      },
    });
  }

  // --- enviar (equipe) ---

  /** Cria a instância PENDING e devolve o link de uso único (token cru só aqui). */
  async send(
    tenantId: string,
    input: { patientId: string; templateId: string },
  ) {
    const scope = new TenantScope(tenantId);
    const [patient, template] = await Promise.all([
      this.prisma.patient.findFirst({
        where: scope.where<Prisma.PatientWhereInput>({
          id: input.patientId,
          deletedAt: null,
        }),
        select: { id: true },
      }),
      this.prisma.anamnesisTemplate.findFirst({
        where: scope.where<Prisma.AnamnesisTemplateWhereInput>({
          id: input.templateId,
          active: true,
        }),
        select: { id: true },
      }),
    ]);
    scope.ensureOwned(patient); // 403 anti-IDOR
    if (!template) {
      throw new NotFoundException("Modelo de anamnese não encontrado.");
    }

    const token = randomBytes(24).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + FILL_TTL_MS);
    const anamnesis = await this.prisma.anamnesis.create({
      data: {
        tenantId,
        patientId: input.patientId,
        templateId: input.templateId,
        tokenHash: this.hashToken(token),
        tokenExpiresAt,
      },
      select: { id: true, tokenExpiresAt: true },
    });
    return {
      id: anamnesis.id,
      token,
      link: `/anamnese/${token}`,
      expiresAt: anamnesis.tokenExpiresAt,
    };
  }

  // --- preencher (público, por token) ---

  async getFillForm(token: string) {
    const a = await this.findFillable(token);
    return {
      status: a.status,
      patientName: a.patient.name,
      templateName: a.template.name,
      questions: a.template.questions,
    };
  }

  /** Salva respostas cifradas + grava a evidência de assinatura. Uso único. */
  async submitFill(
    token: string,
    answers: Record<string, unknown>,
    ctx: { ip?: string },
  ) {
    const a = await this.findFillable(token);

    const serialized = JSON.stringify(answers);
    const contentHash = this.esign.contentHash(`${a.id}\n${serialized}`);
    const signedAt = new Date();

    const record = await this.prisma.medicalRecord.upsert({
      where: { patientId: a.patientId },
      update: {},
      create: { tenantId: a.tenantId, patientId: a.patientId },
      select: { id: true },
    });

    // Uso único + anti-corrida: só efetiva se ainda PENDING.
    const res = await this.prisma.anamnesis.updateMany({
      where: { id: a.id, status: "PENDING" },
      data: {
        status: "SIGNED",
        answersEnc: this.crypto.encryptString(serialized),
        contentHash,
        signerIp: ctx.ip ?? null,
        signedAt,
        recordId: record.id,
      },
    });
    if (res.count === 0) {
      throw new BadRequestException("Anamnese já preenchida ou expirada.");
    }
    return { status: "SIGNED" as const, contentHash, signedAt };
  }

  // --- ver (equipe) ---

  /** Visualiza a anamnese preenchida (decifra) e AUDITA o acesso. */
  async view(
    tenantId: string,
    id: string,
    actor: { actorId?: string; ip?: string },
  ) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.anamnesis.findFirst({
      where: scope.where<Prisma.AnamnesisWhereInput>({ id }),
      select: {
        id: true,
        patientId: true,
        status: true,
        contentHash: true,
        signerIp: true,
        signedAt: true,
        answersEnc: true,
        createdAt: true,
        template: { select: { name: true, questions: true } },
      },
    });
    const a = scope.ensureOwned(found); // 403 anti-IDOR

    await this.audit.record({
      tenantId,
      action: "SENSITIVE_READ",
      ...(actor.actorId ? { actorId: actor.actorId } : {}),
      targetType: "Anamnesis",
      targetId: id,
      ...(actor.ip ? { ip: actor.ip } : {}),
      metadata: { patientId: a.patientId },
    });

    const serialized = a.answersEnc
      ? this.crypto.decryptString(a.answersEnc)
      : null;
    const integrityOk =
      serialized != null && a.contentHash != null
        ? this.esign.contentHash(`${a.id}\n${serialized}`) === a.contentHash
        : false;

    return {
      id: a.id,
      status: a.status,
      template: a.template,
      answers: serialized ? (JSON.parse(serialized) as unknown) : null,
      evidence: {
        contentHash: a.contentHash,
        signerIp: a.signerIp,
        signedAt: a.signedAt,
        integrityOk,
      },
    };
  }

  // --- internos ---

  private async findFillable(token: string) {
    const a = await this.prisma.anamnesis.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        status: true,
        tokenExpiresAt: true,
        patient: { select: { name: true } },
        template: { select: { name: true, questions: true } },
      },
    });
    if (
      !a ||
      a.status !== "PENDING" ||
      a.tokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException("Link inválido ou expirado.");
    }
    return a;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
