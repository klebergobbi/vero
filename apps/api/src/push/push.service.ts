import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";

/** Mensagem no formato do Expo Push API. */
export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Ticket retornado pelo Expo por mensagem (mesma ordem do request). */
export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Proxy backend para o Expo Push API (S13b) — CLAUDE.md §7: integração externa só
 * pelo servidor. O endpoint é FIXO (não recebe input → sem SSRF). Timeout 10s.
 * Lança em falha de transporte (o worker da fila trata retry/backoff/DLQ).
 */
@Injectable()
export class PushService {
  private readonly endpoint = "https://exp.host/--/api/v2/push/send";
  private readonly accessToken: string | undefined;
  private readonly timeoutMs = 10_000;

  constructor(config: ConfigService<Env, true>) {
    this.accessToken = config.get("EXPO_ACCESS_TOKEN", { infer: true });
  }

  /** Envia um lote de mensagens; devolve os tickets (mesma ordem). */
  async send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(this.accessToken
            ? { authorization: `Bearer ${this.accessToken}` }
            : {}),
        },
        body: JSON.stringify(messages),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Expo Push respondeu HTTP ${res.status}`);
      }
      const json = (await res.json().catch(() => ({}))) as {
        data?: ExpoPushTicket[];
      };
      return json.data ?? [];
    } finally {
      clearTimeout(timer);
    }
  }
}
