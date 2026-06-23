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

const SIGNED_URL_TTL_SECONDS = 300; // 5 min
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
type Variant = "full" | "thumb";

/**
 * Câmera intraoral / Image2Doc (§6/S36). Anexa imagens ao prontuário reusando a
 * infra cifrada da S26 (CryptoService AES-256-GCM): guarda a imagem cheia E a
 * MINIATURA, ambas cifradas em repouso. A miniatura é gerada no CLIENT (canvas) —
 * sem dependência de imagem nativa no servidor (§8). Servidas por URL assinada de
 * expiração curta (variante full|thumb no token). Acesso gera SENSITIVE_READ.
 * Tenant-scoped (anti-IDOR). Upload p/ DO Spaces = troca de produção (como S26/S24).
 */
@Injectable()
export class ImageService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get("JWT_SECRET", { infer: true });
  }

  /** Anexa uma imagem intraoral (cifra a imagem cheia + a miniatura). */
  async addImage(
    tenantId: string,
    patientId: string,
    input: {
      filename: string;
      contentType: string;
      dataBase64: string;
      thumbnailBase64?: string;
    },
  ) {
    if (!input.contentType.startsWith("image/")) {
      throw new BadRequestException("Apenas imagens são aceitas.");
    }
    const data = Buffer.from(input.dataBase64, "base64");
    if (data.length === 0) throw new BadRequestException("Imagem vazia.");
    if (data.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException("Imagem acima do limite (12 MB).");
    }
    // Sem miniatura do client → usa a própria imagem (a UI deve enviar a thumb).
    const thumb = input.thumbnailBase64
      ? Buffer.from(input.thumbnailBase64, "base64")
      : data;

    const record = await this.getOrCreateRecord(tenantId, patientId);
    const att = await this.prisma.attachment.create({
      data: {
        tenantId,
        recordId: record.id,
        filename: input.filename,
        contentType: input.contentType,
        dataEnc: Buffer.from(this.crypto.encrypt(data), "utf8"),
        thumbnailEnc: Buffer.from(this.crypto.encrypt(thumb), "utf8"),
      },
      select: { id: true, filename: true, contentType: true, createdAt: true },
    });
    return this.toImage(att);
  }

  /** Lista as imagens do prontuário (com URLs assinadas). AUDITA o acesso. */
  async listImages(
    tenantId: string,
    patientId: string,
    actor: { actorId?: string; ip?: string },
  ) {
    const record = await this.getOrCreateRecord(tenantId, patientId);
    const atts = await this.prisma.attachment.findMany({
      where: {
        recordId: record.id,
        contentType: { startsWith: "image/" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, contentType: true, createdAt: true },
    });

    await this.audit.record({
      tenantId,
      action: "SENSITIVE_READ",
      ...(actor.actorId ? { actorId: actor.actorId } : {}),
      targetType: "Attachment",
      targetId: record.id,
      ...(actor.ip ? { ip: actor.ip } : {}),
      metadata: { patientId, kind: "image-list" },
    });

    return atts.map((a) => this.toImage(a));
  }

  /** Serve a imagem (variante full|thumb) decifrada. AUDITA o acesso. */
  async serveImage(token: string) {
    const { id, variant } = this.verifyToken(token);
    const att = await this.prisma.attachment.findUnique({
      where: { id },
      select: {
        tenantId: true,
        contentType: true,
        dataEnc: true,
        thumbnailEnc: true,
        record: { select: { patientId: true } },
      },
    });
    if (!att) throw new NotFoundException();

    const blob =
      variant === "thumb" && att.thumbnailEnc ? att.thumbnailEnc : att.dataEnc;
    const data = this.crypto.decrypt(Buffer.from(blob).toString("utf8"));

    await this.audit.record({
      tenantId: att.tenantId,
      action: "SENSITIVE_READ",
      targetType: "Attachment",
      targetId: id,
      metadata: { patientId: att.record.patientId, variant },
    });
    return { data, contentType: att.contentType };
  }

  // --- internos ---

  private toImage(att: {
    id: string;
    filename: string;
    contentType: string;
    createdAt: Date;
  }) {
    return {
      id: att.id,
      filename: att.filename,
      contentType: att.contentType,
      createdAt: att.createdAt,
      url: this.signedUrl(att.id, "full"),
      thumbnailUrl: this.signedUrl(att.id, "thumb"),
    };
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

  private signedUrl(id: string, variant: Variant): string {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const sig = this.hmac(`${id}.${variant}.${exp}`);
    return `/records/images/${id}.${variant}.${exp}.${sig}`;
  }

  private verifyToken(token: string): { id: string; variant: Variant } {
    const parts = token.split(".");
    if (parts.length !== 4) throw new NotFoundException();
    const [id, variant, expStr, sig] = parts as [
      string,
      string,
      string,
      string,
    ];
    if (variant !== "full" && variant !== "thumb") {
      throw new NotFoundException();
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      throw new NotFoundException("Link expirado.");
    }
    if (!this.safeEqual(sig, this.hmac(`${id}.${variant}.${exp}`))) {
      throw new NotFoundException();
    }
    return { id, variant };
  }

  private hmac(payload: string): string {
    return createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
