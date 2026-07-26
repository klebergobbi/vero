import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../record/crypto.service";
import type {
  CreateApiKeyDto,
  CreateWebhookDto,
  UpdateBrandingDto,
} from "./dto/api-key.dto";

function sha256hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    config: ConfigService<Env, true>,
  ) {
    this.isProd = config.get("NODE_ENV", { infer: true }) === "production";
  }

  // ── API Keys ──────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateApiKeyDto) {
    const raw = `vero_${randomBytes(32).toString("base64url")}`;
    const keyHash = sha256hex(raw);
    const keyPrefix = raw.slice(0, 12);

    const key = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyHash,
        keyPrefix,
        scopes: dto.scopes,
        rateLimit: dto.rateLimit ?? 60,
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Plain key returned ONCE — never stored.
    return { ...key, key: raw };
  }

  async list(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revoke(tenantId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!key) throw new ForbiddenException();
    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  /**
   * Valida uma API key pelo seu plain value. Retorna a chave se válida.
   * Nunca lança — retorna null para chave inválida (o guard decide o status HTTP).
   */
  async validateKey(plain: string): Promise<{
    id: string;
    tenantId: string;
    scopes: string[];
    rateLimit: number;
  } | null> {
    const keyHash = sha256hex(plain);
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        tenantId: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        deletedAt: true,
      },
    });

    if (!key || !key.isActive || key.deletedAt) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    // Fire-and-forget: atualiza lastUsedAt sem bloquear o request.
    void this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: key.id,
      tenantId: key.tenantId,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
    };
  }

  // ── Branding ──────────────────────────────────────────────────────────────

  async getBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, brandColor: true, logoUrl: true },
    });
    if (!tenant) throw new NotFoundException();
    return tenant;
  }

  async updateBranding(tenantId: string, dto: UpdateBrandingDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.brandColor !== undefined ? { brandColor: dto.brandColor } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      },
      select: { name: true, brandColor: true, logoUrl: true },
    });
  }

  // ── Outbound Webhooks ─────────────────────────────────────────────────────

  async createWebhook(tenantId: string, dto: CreateWebhookDto) {
    this.assertPublicUrl(dto.url);

    const secret = randomBytes(24).toString("hex");
    const secretEnc = this.crypto.encryptString(secret);

    const wh = await this.prisma.outboundWebhook.create({
      data: {
        tenantId,
        name: dto.name ?? dto.url,
        url: dto.url,
        events: dto.events,
        secretEnc,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Secret retornado UMA única vez.
    return { ...wh, secret };
  }

  async listWebhooks(tenantId: string) {
    return this.prisma.outboundWebhook.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeWebhook(tenantId: string, id: string) {
    const wh = await this.prisma.outboundWebhook.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!wh) throw new ForbiddenException();
    await this.prisma.outboundWebhook.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  /**
   * Entrega um evento de domínio a todos os webhooks ativos que registraram
   * esse evento. Fire-and-forget: erros são swallowed (sem retry aqui).
   */
  async deliverEvent(tenantId: string, event: string, payload: unknown) {
    const hooks = await this.prisma.outboundWebhook.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        events: { has: event },
      },
      select: { url: true, secretEnc: true },
    });

    for (const hook of hooks) {
      try {
        this.assertPublicUrl(hook.url);
      } catch {
        this.logger.warn(`Webhook para host interno bloqueado: ${hook.url}`);
        continue;
      }

      const body = JSON.stringify({
        event,
        tenantId,
        payload,
        ts: new Date().toISOString(),
      });
      // HMAC-SHA256 sobre o body com o segredo PLAIN (decifrado) — o terceiro
      // assina/verifica com o mesmo segredo que recebeu na criação do webhook.
      const secret = this.crypto.decryptString(hook.secretEnc);
      const sig = createHmac("sha256", secret).update(body).digest("hex");

      // Fire-and-forget — erros swallowed (§4 fail-safe para eventos de saída).
      void fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vero-Signature": `sha256=${sig}`,
          "X-Vero-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
    }
  }

  /**
   * Anti-SSRF (§4): recusa URL de webhook apontando para host interno em produção
   * (loopback / RFC1918 / link-local 169.254 metadados / IPv6 local).
   */
  private assertPublicUrl(url: string): void {
    if (!this.isProd) return;
    const { hostname } = new URL(url);
    if (this.isInternalHost(hostname)) {
      throw new BadRequestException(
        "URL de webhook inválida (host interno bloqueado).",
      );
    }
  }

  /** Loopback / privado (RFC1918) / link-local (169.254 metadados) / IPv6 local. */
  private isInternalHost(host: string): boolean {
    const h = host.toLowerCase();
    if (h === "localhost" || h.endsWith(".local")) return true;
    const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (a === 0 || a === 127 || a === 10) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
    }
    if (
      h === "::1" ||
      h.startsWith("fc") ||
      h.startsWith("fd") ||
      h.startsWith("fe80")
    ) {
      return true;
    }
    return false;
  }

  // ── V1 endpoint helpers ───────────────────────────────────────────────────

  async listAppointments(
    tenantId: string,
    params: { from?: string; to?: string },
  ) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(params.from ? { startsAt: { gte: new Date(params.from) } } : {}),
        ...(params.to ? { endsAt: { lte: new Date(params.to) } } : {}),
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        unitId: true,
        professionalId: true,
        patientId: true,
      },
      orderBy: { startsAt: "asc" },
      take: 200,
    });
  }

  async listPatients(tenantId: string, params: { q?: string }) {
    return this.prisma.patient.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q, mode: "insensitive" } },
                { phone: { contains: params.q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        leadSource: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  /**
   * Verifica em tempo constante se dois strings são iguais.
   * Usado pelo guard p/ comparar tokens sem vazar timing.
   */
  static timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
