import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";

export interface SpcQueryResult {
  score: number;
  externalId: string;
}

export interface SpcIncludeInput {
  cpf: string;
  amountCents: number;
  description: string;
}

export interface SpcIncludeResult {
  externalId: string;
}

interface SpcQueryResponse {
  score?: number;
  id?: string;
}
interface SpcIncludeResponse {
  id?: string;
  protocolo?: string;
}

/**
 * Proxy backend para o bureau de crédito (SPC/Serasa) — §7/S25. Integração SEMPRE
 * pelo servidor, segredos só aqui. Anti-SSRF (§4): URL só da base configurada
 * (`SPC_API_URL`), nunca de input; o CPF vai no corpo. Fail-closed: sem config →
 * ServiceUnavailable. Em produção recusa base apontando p/ host interno.
 */
@Injectable()
export class SpcService {
  private readonly logger = new Logger(SpcService.name);
  private readonly baseUrl: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly isProd: boolean;
  private readonly timeoutMs = 12_000;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get("SPC_API_URL", { infer: true });
    this.apiKey = config.get("SPC_API_KEY", { infer: true });
    this.isProd = config.get("NODE_ENV", { infer: true }) === "production";
  }

  get configured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  /** Consulta o score de um CPF. Lança em falha (o worker trata retry/DLQ). */
  async query(cpf: string): Promise<SpcQueryResult> {
    const data = await this.post<SpcQueryResponse>("consultas", { cpf });
    if (typeof data.score !== "number" || !data.id) {
      throw new Error("Resposta do SPC inválida (consulta)");
    }
    return { score: data.score, externalId: data.id };
  }

  /** Inclui um inadimplente (registro de dívida). */
  async include(input: SpcIncludeInput): Promise<SpcIncludeResult> {
    const data = await this.post<SpcIncludeResponse>("inclusoes", {
      cpf: input.cpf,
      value: input.amountCents / 100,
      description: input.description,
    });
    const id = data.id ?? data.protocolo;
    if (!id) throw new Error("Resposta do SPC inválida (inclusão)");
    return { externalId: id };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException("Integração SPC não configurada.");
    }
    const url = this.endpoint(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`SPC respondeu HTTP ${res.status}`);
      return (await res.json().catch(() => ({}))) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Resolve o endpoint a partir da base (anti-SSRF; bloqueia host interno em prod). */
  private endpoint(path: string): string {
    const base = new URL(this.baseUrl!);
    if (this.isProd && this.isInternalHost(base.hostname)) {
      this.logger.error(`Base SPC aponta para host interno: ${base.hostname}`);
      throw new ServiceUnavailableException("Destino SPC inválido.");
    }
    const basePath = base.pathname.endsWith("/")
      ? base.pathname
      : `${base.pathname}/`;
    const resolved = new URL(path, `${base.origin}${basePath}`);
    if (resolved.origin !== base.origin) {
      throw new ServiceUnavailableException("Destino SPC inválido.");
    }
    return resolved.toString();
  }

  /** Loopback / privado (RFC1918) / link-local (metadados) / IPv6 local. */
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
}
