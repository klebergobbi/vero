import { Injectable, Logger } from "@nestjs/common";
import { AgentService } from "../../ai/agent.service";
import { MeService } from "../../me/me.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { WhatsAppService } from "./whatsapp.service";

/** Resultado do processamento (p/ log/observabilidade e testes). */
export type InboundOutcome =
  | "confirmed"
  | "duplicate"
  | "ignored"
  | "no-match"
  | "agent-handled";

/** Recorte do payload de mensagem da Evolution (campos que usamos). */
export interface EvolutionWebhookPayload {
  data?: {
    key?: { id?: string; remoteJid?: string; fromMe?: boolean };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
  };
}

// Respostas que contam como confirmação (normalizadas: trim + lowercase).
const AFFIRMATIVE = new Set([
  "sim",
  "s",
  "1",
  "ok",
  "confirmar",
  "confirmo",
  "confirmado",
  "confirmada",
  "pode confirmar",
  "👍",
]);

/**
 * Processa a resposta do paciente vinda do webhook da Evolution (S12b).
 * - IDEMPOTENTE por id de evento (Redis SETNX): reprocessar o mesmo webhook não
 *   reconfirma (reprocesso não duplica — aceite S12).
 * - Resolve a consulta pelo TELEFONE do remetente (nunca um id vindo do payload →
 *   sem IDOR) e reusa a confirmação idempotente da S11 com `source: WHATSAPP`.
 * - Mensagens que NÃO são uma confirmação simples (ou que não casam com uma
 *   consulta pendente) são delegadas ao agente de IA (S50) — que só propõe;
 *   toda escrita no banco continua validada pelos services existentes.
 */
@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);
  private static readonly DEDUP_TTL_SECONDS = 7 * 24 * 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly me: MeService,
    private readonly agent: AgentService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async handleInbound(
    payload: EvolutionWebhookPayload,
  ): Promise<InboundOutcome> {
    const key = payload.data?.key;
    const eventId = key?.id;
    const remoteJid = key?.remoteJid;
    const text =
      payload.data?.message?.conversation ??
      payload.data?.message?.extendedTextMessage?.text;

    // Ignora eventos sem dados úteis ou mensagens enviadas por nós (fromMe).
    if (!eventId || key?.fromMe || !remoteJid || !text) return "ignored";

    // Idempotência por id de evento: só o PRIMEIRO processamento segue adiante.
    const fresh = await this.redis.set(
      `wa:webhook:${eventId}`,
      "1",
      "EX",
      WhatsAppWebhookService.DEDUP_TTL_SECONDS,
      "NX",
    );
    if (fresh !== "OK") return "duplicate";

    // Caminho rápido/determinístico (S12b, sem custo de IA): "sim" respondendo a
    // um lembrete de consulta já agendada confirma direto. Só esse caso exato
    // (afirmativo + consulta pendente) evita o agente — qualquer outra coisa cai
    // nele (inclusive "sim" que faça parte de uma conversa em andamento).
    if (this.isAffirmative(text)) {
      const appt = await this.findUpcomingScheduled(remoteJid);
      if (appt) {
        // Reusa a lógica idempotente da S11 (status + ConfirmationEvent atômicos).
        await this.me.confirmAppointment(
          appt.tenantId,
          appt.patientId,
          appt.id,
          "WHATSAPP",
        );
        this.logger.log(
          `Confirmação por WhatsApp: appointment ${appt.id} (tenant ${appt.tenantId})`,
        );
        return "confirmed";
      }
    }

    // Agente de IA (S50) — interpreta a conversa livre; sem chave configurada,
    // devolve null e a mensagem é apenas ignorada (fail-closed, sem quebrar o webhook).
    const phone = remoteJid.split("@")[0] ?? "";
    const reply = await this.agent.handleMessage(phone, text);
    if (!reply) return "ignored";

    await this.whatsapp.sendText(phone, reply);
    return "agent-handled";
  }

  /**
   * Acha a próxima consulta SCHEDULED do remetente. O telefone do paciente é
   * armazenado só com dígitos (S5), tipicamente sem DDI; o JID do WhatsApp vem com
   * DDI 55 — por isso casamos por candidatos (com/sem 55, últimos 11/10 dígitos).
   */
  private async findUpcomingScheduled(remoteJid: string) {
    const raw = remoteJid.split("@")[0]?.replace(/\D/g, "") ?? "";
    if (!raw) return null;
    const candidates = new Set<string>([raw, raw.slice(-11), raw.slice(-10)]);
    if (raw.startsWith("55") && raw.length > 11) candidates.add(raw.slice(2));

    return this.prisma.appointment.findFirst({
      where: {
        status: "SCHEDULED",
        deletedAt: null,
        startsAt: { gte: new Date() },
        patient: { phone: { in: [...candidates] }, deletedAt: null },
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, tenantId: true, patientId: true },
    });
  }

  private isAffirmative(text: string): boolean {
    return AFFIRMATIVE.has(text.trim().toLowerCase());
  }
}
