import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";

/** Resposta mínima do endpoint sendText da Evolution (formato varia por versão). */
interface EvolutionSendResponse {
  key?: { id?: string };
  id?: string;
}

/**
 * Proxy backend para a Evolution API (WhatsApp) — CLAUDE.md §7: toda integração
 * externa passa pelo servidor, NUNCA pelo client; segredos só aqui.
 *
 * Anti-SSRF (§4 A01): a URL de destino é construída SOMENTE a partir da base
 * configurada (`EVOLUTION_API_URL`), jamais de input do usuário; o número/telefone
 * vai no corpo, não na URL. Em produção, recusa base apontando para host interno/
 * loopback/metadados de cloud. Fail-closed: sem config → ServiceUnavailable.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly instance: string | undefined;
  private readonly isProd: boolean;
  private readonly timeoutMs = 10_000;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get("EVOLUTION_API_URL", { infer: true });
    this.apiKey = config.get("EVOLUTION_API_KEY", { infer: true });
    this.instance = config.get("EVOLUTION_INSTANCE", { infer: true });
    this.isProd = config.get("NODE_ENV", { infer: true }) === "production";
  }

  /**
   * Envia uma mensagem de texto pelo WhatsApp. Lança em qualquer falha (o worker
   * da fila trata retry/backoff/DLQ). Retorna o id da mensagem na Evolution.
   */
  async sendText(phone: string, text: string): Promise<{ id: string }> {
    if (!this.baseUrl || !this.apiKey || !this.instance) {
      throw new ServiceUnavailableException(
        "Integração WhatsApp não configurada.",
      );
    }

    const url = this.endpoint(
      `message/sendText/${encodeURIComponent(this.instance)}`,
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({ number: this.onlyDigits(phone), text }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Evolution respondeu HTTP ${res.status}`);
      }
      const data = (await res
        .json()
        .catch(() => ({}))) as EvolutionSendResponse;
      return { id: data.key?.id ?? data.id ?? "sent" };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Resolve o endpoint final a partir da base configurada. Garante que o path não
   * escapa a origem da base (anti-SSRF) e bloqueia hosts internos em produção.
   */
  private endpoint(path: string): string {
    const base = new URL(this.baseUrl!);
    if (this.isProd && this.isInternalHost(base.hostname)) {
      this.logger.error(
        `Base WhatsApp aponta para host interno: ${base.hostname}`,
      );
      throw new ServiceUnavailableException("Destino WhatsApp inválido.");
    }
    const basePath = base.pathname.endsWith("/")
      ? base.pathname
      : `${base.pathname}/`;
    const resolved = new URL(path, `${base.origin}${basePath}`);
    if (resolved.origin !== base.origin) {
      throw new ServiceUnavailableException("Destino WhatsApp inválido.");
    }
    return resolved.toString();
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

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, "");
  }
}
