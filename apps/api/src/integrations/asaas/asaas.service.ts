import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";

export type AsaasMethod = "PIX" | "BOLETO" | "CARD";

export interface AsaasPaymentInput {
  valueCents: number;
  /** vencimento no formato YYYY-MM-DD. */
  dueDate: string;
  method: AsaasMethod;
  description: string;
  externalReference?: string;
}

export interface AsaasPaymentResult {
  id: string;
  pixPayload?: string;
  boletoBarcode?: string;
}

/** Resposta mínima do Asaas (campos variam; lemos o essencial). */
interface AsaasResponse {
  id?: string;
  pixCopiaECola?: string;
  identificationField?: string;
}

const BILLING_TYPE: Record<AsaasMethod, string> = {
  PIX: "PIX",
  BOLETO: "BOLETO",
  CARD: "CREDIT_CARD",
};

/**
 * Proxy backend para o Asaas (pagamentos) — CLAUDE.md §7: integração externa
 * SEMPRE pelo servidor, segredos só aqui. Anti-SSRF (§4): URL só da base
 * configurada (`ASAAS_API_URL`), nunca de input; valores no corpo. Fail-closed:
 * sem config → ServiceUnavailable. Em produção recusa base p/ host interno.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly baseUrl: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly isProd: boolean;
  private readonly timeoutMs = 10_000;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get("ASAAS_API_URL", { infer: true });
    this.apiKey = config.get("ASAAS_API_KEY", { infer: true });
    this.isProd = config.get("NODE_ENV", { infer: true }) === "production";
  }

  get configured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  /** Cria uma cobrança no Asaas. Lança em falha (o chamador trata). */
  async createPayment(input: AsaasPaymentInput): Promise<AsaasPaymentResult> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException(
        "Integração Asaas não configurada.",
      );
    }
    const url = this.endpoint("payments");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          access_token: this.apiKey,
        },
        body: JSON.stringify({
          billingType: BILLING_TYPE[input.method],
          // Asaas usa valor em reais (decimal); convertemos dos centavos do servidor.
          value: input.valueCents / 100,
          dueDate: input.dueDate,
          description: input.description,
          ...(input.externalReference
            ? { externalReference: input.externalReference }
            : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Asaas respondeu HTTP ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as AsaasResponse;
      if (!data.id) throw new Error("Asaas não retornou id de pagamento");
      const result: AsaasPaymentResult = { id: data.id };
      if (data.pixCopiaECola) result.pixPayload = data.pixCopiaECola;
      if (data.identificationField)
        result.boletoBarcode = data.identificationField;
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
        `Base Asaas aponta para host interno: ${base.hostname}`,
      );
      throw new ServiceUnavailableException("Destino Asaas inválido.");
    }
    const basePath = base.pathname.endsWith("/")
      ? base.pathname
      : `${base.pathname}/`;
    const resolved = new URL(path, `${base.origin}${basePath}`);
    if (resolved.origin !== base.origin) {
      throw new ServiceUnavailableException("Destino Asaas inválido.");
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
