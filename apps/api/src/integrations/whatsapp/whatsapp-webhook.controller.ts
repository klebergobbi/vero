import { createHash, timingSafeEqual } from "node:crypto";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";
import { Public } from "../../common/decorators/public.decorator";
import {
  type EvolutionWebhookPayload,
  WhatsAppWebhookService,
} from "./whatsapp-webhook.service";

/**
 * Webhook da Evolution para respostas do paciente (S12b). Rota PÚBLICA (sem JWT),
 * protegida por um SEGREDO compartilhado (header `x-webhook-token` ou query
 * `?token=`), comparado em tempo constante. Fail-closed: sem segredo configurado,
 * recusa tudo. Sempre 200 nos casos de negócio (evita retempestade de retries da
 * Evolution); só credencial inválida → 401.
 */
@Controller("integrations/whatsapp")
export class WhatsAppWebhookController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly service: WhatsAppWebhookService,
  ) {}

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers("x-webhook-token") headerToken: string | undefined,
    @Query("token") queryToken: string | undefined,
    @Body() body: EvolutionWebhookPayload,
  ): Promise<{ ok: true; outcome: string }> {
    this.assertSecret(headerToken ?? queryToken);
    const outcome = await this.service.handleInbound(body ?? {});
    return { ok: true, outcome };
  }

  /** Valida o segredo em tempo constante (anti timing attack). Fail-closed. */
  private assertSecret(provided: string | undefined): void {
    const expected = this.config.get("EVOLUTION_WEBHOOK_SECRET", {
      infer: true,
    });
    if (!expected) {
      throw new ServiceUnavailableException("Webhook não configurado.");
    }
    if (!provided || !this.safeEqual(provided, expected)) {
      throw new UnauthorizedException();
    }
  }

  // Compara via hash de tamanho fixo (timingSafeEqual exige buffers do mesmo length).
  private safeEqual(a: string, b: string): boolean {
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
