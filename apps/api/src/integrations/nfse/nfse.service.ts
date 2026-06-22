import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";

export interface NfseEmitInput {
  amountCents: number;
  description: string;
  customerName: string;
  customerCpf?: string;
  externalReference?: string;
}

export interface NfseEmitResult {
  externalId: string;
  number?: string;
  pdfUrl?: string;
}

/** Resposta mínima do integrador (campos variam por integrador). */
interface NfseResponse {
  id?: string;
  numero?: string;
  number?: string;
  pdfUrl?: string;
  urlPdf?: string;
}

/**
 * Proxy backend para o integrador de NFS-e (§7/S23). Integração SEMPRE pelo
 * servidor, segredos só aqui. Anti-SSRF (§4): URL só da base configurada
 * (`NFSE_API_URL`), nunca de input. Fail-closed: sem config → ServiceUnavailable.
 * Em produção recusa base apontando p/ host interno.
 */
@Injectable()
export class NfseService {
  private readonly logger = new Logger(NfseService.name);
  private readonly baseUrl: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly isProd: boolean;
  private readonly timeoutMs = 15_000;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get("NFSE_API_URL", { infer: true });
    this.apiKey = config.get("NFSE_API_KEY", { infer: true });
    this.isProd = config.get("NODE_ENV", { infer: true }) === "production";
  }

  get configured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  /** Emite a NFS-e no integrador. Lança em falha (o worker trata retry/DLQ). */
  async emit(input: NfseEmitInput): Promise<NfseEmitResult> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException(
        "Integração NFS-e não configurada.",
      );
    }
    const url = this.endpoint("nfse");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          // valor em reais (decimal) convertido dos centavos do servidor.
          value: input.amountCents / 100,
          description: input.description,
          customer: { name: input.customerName, cpf: input.customerCpf },
          ...(input.externalReference
            ? { externalReference: input.externalReference }
            : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok)
        throw new Error(`Integrador NFS-e respondeu HTTP ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as NfseResponse;
      if (!data.id) throw new Error("Integrador NFS-e não retornou id");
      const result: NfseEmitResult = { externalId: data.id };
      const number = data.numero ?? data.number;
      const pdf = data.pdfUrl ?? data.urlPdf;
      if (number) result.number = number;
      if (pdf) result.pdfUrl = pdf;
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Resolve o endpoint a partir da base (anti-SSRF; bloqueia host interno em prod). */
  private endpoint(path: string): string {
    const base = new URL(this.baseUrl!);
    if (this.isProd && this.isInternalHost(base.hostname)) {
      this.logger.error(
        `Base NFS-e aponta para host interno: ${base.hostname}`,
      );
      throw new ServiceUnavailableException("Destino NFS-e inválido.");
    }
    const basePath = base.pathname.endsWith("/")
      ? base.pathname
      : `${base.pathname}/`;
    const resolved = new URL(path, `${base.origin}${basePath}`);
    if (resolved.origin !== base.origin) {
      throw new ServiceUnavailableException("Destino NFS-e inválido.");
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
