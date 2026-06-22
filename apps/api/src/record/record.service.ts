import { createHmac, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { AuditService } from "../common/audit/audit.service";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import type { Env } from "../config/env.validation";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "./crypto.service";

const ATTACH_URL_TTL_SECONDS = 300; // 5 min
const MAX_ATTACH_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Prontuário (§6/S26). Dado de SAÚDE: conteúdo das entradas e bytes dos anexos
 * CIFRADOS em repouso (CryptoService AES-256-GCM); TODO acesso de leitura gera
 * SENSITIVE_READ no AuditLog (§4 A09). Tenant-scoped (anti-IDOR). Anexos servidos
 * por URL assinada de expiração curta.
 */
@Injectable()
export class RecordService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get("JWT_SECRET", { infer: true });
  }

  /** Visualiza o prontuário (decifra as entradas) e AUDITA o acesso. */
  async viewRecord(
    tenantId: string,
    patientId: string,
    actor: { actorId?: string; ip?: string },
  ) {
    const record = await this.getOrCreateRecord(tenantId, patientId);
    const [entries, attachments] = await Promise.all([
      this.prisma.recordEntry.findMany({
        where: { recordId: record.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          authorId: true,
          contentEnc: true,
          createdAt: true,
        },
      }),
      this.prisma.attachment.findMany({
        where: { recordId: record.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filename: true,
          contentType: true,
          createdAt: true,
        },
      }),
    ]);

    await this.audit.record({
      tenantId,
      action: "SENSITIVE_READ",
      ...(actor.actorId ? { actorId: actor.actorId } : {}),
      targetType: "MedicalRecord",
      targetId: record.id,
      ...(actor.ip ? { ip: actor.ip } : {}),
      metadata: { patientId },
    });

    return {
      id: record.id,
      entries: entries.map((e) => ({
        id: e.id,
        authorId: e.authorId,
        content: this.crypto.decryptString(e.contentEnc),
        createdAt: e.createdAt,
      })),
      // URL assinada fresca por anexo (expira em 5min) — pronta p/ baixar.
      attachments: attachments.map((a) => ({ ...a, ...this.signedUrl(a.id) })),
    };
  }

  async addEntry(
    tenantId: string,
    patientId: string,
    authorId: string,
    content: string,
  ) {
    const record = await this.getOrCreateRecord(tenantId, patientId);
    const entry = await this.prisma.recordEntry.create({
      data: {
        tenantId,
        recordId: record.id,
        authorId,
        contentEnc: this.crypto.encryptString(content),
      },
      select: { id: true, createdAt: true },
    });
    return entry;
  }

  async addAttachment(
    tenantId: string,
    patientId: string,
    input: { filename: string; contentType: string; dataBase64: string },
  ) {
    const data = Buffer.from(input.dataBase64, "base64");
    if (data.length === 0) throw new BadRequestException("Arquivo vazio.");
    if (data.length > MAX_ATTACH_BYTES) {
      throw new BadRequestException("Arquivo acima do limite (8 MB).");
    }
    const record = await this.getOrCreateRecord(tenantId, patientId);
    const att = await this.prisma.attachment.create({
      data: {
        tenantId,
        recordId: record.id,
        filename: input.filename,
        contentType: input.contentType,
        dataEnc: Buffer.from(this.crypto.encrypt(data), "utf8"),
      },
      select: { id: true, filename: true, contentType: true, createdAt: true },
    });
    return { ...att, ...this.signedUrl(att.id) };
  }

  /** Serve o anexo decifrado (o token já autorizou; valida-o). AUDITA o acesso. */
  async serveAttachment(token: string) {
    const attachmentId = this.verifyToken(token);
    const att = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        tenantId: true,
        filename: true,
        contentType: true,
        dataEnc: true,
        record: { select: { patientId: true } },
      },
    });
    if (!att) throw new NotFoundException();
    await this.audit.record({
      tenantId: att.tenantId,
      action: "SENSITIVE_READ",
      targetType: "Attachment",
      targetId: attachmentId,
      metadata: { patientId: att.record.patientId },
    });
    const data = this.crypto.decrypt(Buffer.from(att.dataEnc).toString("utf8"));
    return { data, contentType: att.contentType, filename: att.filename };
  }

  // --- internos ---

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

  private signedUrl(attachmentId: string): {
    url: string;
    expiresAt: string;
  } {
    const exp = Math.floor(Date.now() / 1000) + ATTACH_URL_TTL_SECONDS;
    const sig = this.sign(`${attachmentId}.${exp}`);
    return {
      url: `/records/attachments/${attachmentId}.${exp}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  private verifyToken(token: string): string {
    const parts = token.split(".");
    if (parts.length !== 3) throw new NotFoundException();
    const [id, expStr, sig] = parts as [string, string, string];
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      throw new NotFoundException("Link expirado.");
    }
    if (!this.safeEqual(sig, this.sign(`${id}.${exp}`))) {
      throw new NotFoundException();
    }
    return id;
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
