import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type AnthropicRole = "user" | "assistant";

export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

export interface AnthropicMessage {
  role: AnthropicRole;
  content: string | AnthropicContentBlock[];
}

export interface AnthropicResponse {
  content: (AnthropicTextBlock | AnthropicToolUseBlock)[];
  stop_reason: string;
}

/**
 * Proxy backend p/ a Claude Messages API (S50 — agente de agendamento via IA).
 * CLAUDE.md §7: integração externa SEMPRE pelo servidor, segredo só aqui.
 * Endpoint FIXO (não recebe input do usuário — sem risco de SSRF, ao contrário
 * de integrações com base configurável). Fail-closed sem `ANTHROPIC_API_KEY`.
 */
@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs = 20_000;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get("ANTHROPIC_API_KEY", { infer: true });
    this.model = config.get("ANTHROPIC_MODEL", { infer: true });
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  async createMessage(input: {
    system: string;
    messages: AnthropicMessage[];
    tools: AnthropicTool[];
    maxTokens?: number;
  }): Promise<AnthropicResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        "Agente de IA não configurado (ANTHROPIC_API_KEY ausente).",
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: input.maxTokens ?? 1024,
          system: input.system,
          messages: input.messages,
          tools: input.tools,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        this.logger.error(`Anthropic respondeu HTTP ${res.status}: ${detail}`);
        throw new Error(`Anthropic respondeu HTTP ${res.status}`);
      }
      return (await res.json()) as AnthropicResponse;
    } finally {
      clearTimeout(timer);
    }
  }
}
