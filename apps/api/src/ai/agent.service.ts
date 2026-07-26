import { Injectable, Logger } from "@nestjs/common";
import { wallTimeToUtc } from "../appointment/agenda.util";
import { AppointmentService } from "../appointment/appointment.service";
import { SlotService } from "../appointment/slot.service";
import { MeService } from "../me/me.service";
import { OrgService } from "../org/org.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  AnthropicService,
  type AnthropicContentBlock,
  type AnthropicMessage,
  type AnthropicTool,
  type AnthropicToolUseBlock,
} from "../integrations/anthropic/anthropic.service";

const CONVERSATION_TTL_SECONDS = 30 * 60; // 30min de silêncio encerra a conversa
const MAX_HISTORY_MESSAGES = 20; // limita custo/tamanho do contexto
const MAX_TOOL_ROUNDS = 4; // guardrail: evita loop indefinido de ferramentas

// Disclosure de IA (§5 loja) — HARD-CODED, nunca deixado à discrição do modelo:
// garante que o paciente sempre saiba que fala com um assistente automatizado.
const DISCLOSURE =
  "🤖 Você está falando com o assistente virtual do Vero. Ele pode ajudar a " +
  "agendar ou confirmar consultas por aqui; toda ação passa por validação " +
  "automática do sistema antes de ser confirmada.\n\n";

const SYSTEM_PROMPT = `Você é o assistente virtual de agendamento de uma clínica odontológica (Vero), conversando por WhatsApp com um paciente já cadastrado.

Regras OBRIGATÓRIAS:
- Você NUNCA decide sozinho: toda reserva só é efetivada depois que uma ferramenta validar disponibilidade e ausência de conflito no sistema. Se uma ferramenta retornar erro (ex.: horário ocupado), avise o paciente e ofereça alternativas — nunca diga que "confirmou" algo sem a ferramenta ter retornado sucesso.
- Use list_professionals para saber os profissionais disponíveis antes de perguntar um nome ao paciente.
- Use find_slots para ver horários livres de um profissional numa data antes de propor horários.
- Use book_appointment só depois que o paciente confirmar EXPLICITAMENTE a data/hora escolhida.
- Use confirm_appointment quando o paciente disser que quer confirmar presença numa consulta já marcada.
- Seja breve, cordial e objetivo — mensagens curtas, adequadas a um chat de WhatsApp.
- Se não entender o pedido, peça esclarecimento em vez de adivinhar.`;

const TOOLS: AnthropicTool[] = [
  {
    name: "list_professionals",
    description: "Lista os profissionais (dentistas) disponíveis na clínica.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "find_slots",
    description:
      "Lista horários livres de um profissional numa data (o sistema já filtra conflitos e antecedência mínima).",
    input_schema: {
      type: "object",
      properties: {
        professionalId: { type: "string" },
        date: { type: "string", description: "Data no formato YYYY-MM-DD" },
      },
      required: ["professionalId", "date"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Reserva uma consulta num horário livre. O sistema RE-VALIDA disponibilidade e conflito antes de confirmar — pode falhar mesmo que find_slots tenha mostrado o horário como livre (corrida com outro agendamento).",
    input_schema: {
      type: "object",
      properties: {
        professionalId: { type: "string" },
        date: { type: "string", description: "Data no formato YYYY-MM-DD" },
        time: {
          type: "string",
          description: "Hora no formato HH:mm (fuso da unidade)",
        },
      },
      required: ["professionalId", "date", "time"],
    },
  },
  {
    name: "confirm_appointment",
    description:
      "Confirma a presença do paciente na próxima consulta agendada.",
    input_schema: { type: "object", properties: {} },
  },
];

interface ConversationContext {
  tenantId: string;
  patientId: string;
  unitId: string;
  timezone: string;
}

/**
 * Agente de agendamento via IA no WhatsApp (S50). Interpreta a conversa livre do
 * paciente e decide QUAL ferramenta chamar — mas a ferramenta em si SEMPRE
 * reusa os services já validados (SlotService/AppointmentService/MeService):
 * o modelo nunca escreve no banco diretamente, só propõe a chamada; quem
 * efetiva (ou rejeita por conflito/indisponibilidade) é o backend (§4/§5).
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly anthropic: AnthropicService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly slots: SlotService,
    private readonly appointments: AppointmentService,
    private readonly org: OrgService,
    private readonly me: MeService,
  ) {}

  /**
   * Processa uma mensagem recebida do paciente (por telefone) e devolve o texto
   * de resposta a enviar de volta pelo WhatsApp. Resolve o paciente/tenant pelo
   * telefone (mesmo padrão anti-IDOR do webhook de confirmação, S12b) — o
   * agente só atende pacientes JÁ cadastrados; leads novos seguem pelo
   * agendamento online público (S15b) ou CRM.
   */
  async handleMessage(phone: string, text: string): Promise<string | null> {
    if (!this.anthropic.configured) return null; // sem chave → cai no fluxo simples

    const ctx = await this.resolveContext(phone);
    if (!ctx) {
      return "Não encontrei seu cadastro na clínica. Fale com a recepção para agendar sua primeira consulta.";
    }

    const historyKey = `ai:agent:${ctx.tenantId}:${ctx.patientId}`;
    const existing = await this.redis.get(historyKey);
    const isNewConversation = !existing;
    const history: AnthropicMessage[] = existing ? JSON.parse(existing) : [];

    history.push({ role: "user", content: text });

    const finalText = await this.runToolLoop(ctx, history);

    const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
    await this.redis.set(
      historyKey,
      JSON.stringify(trimmed),
      "EX",
      CONVERSATION_TTL_SECONDS,
    );

    return isNewConversation ? DISCLOSURE + finalText : finalText;
  }

  /** Chama a IA e executa as ferramentas que ela pedir, até uma resposta em texto (ou o cap de rounds). */
  private async runToolLoop(
    ctx: ConversationContext,
    history: AnthropicMessage[],
  ): Promise<string> {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response;
      try {
        response = await this.anthropic.createMessage({
          system: SYSTEM_PROMPT,
          messages: history,
          tools: TOOLS,
        });
      } catch (err) {
        this.logger.error(`Falha ao chamar a IA: ${(err as Error).message}`);
        return "Desculpe, não consegui processar sua mensagem agora. Tente novamente em instantes.";
      }

      const toolUses = response.content.filter(
        (b): b is AnthropicToolUseBlock => b.type === "tool_use",
      );
      const text = response.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      history.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        return text || "Certo!";
      }

      const results: AnthropicContentBlock[] = [];
      for (const call of toolUses) {
        const result = await this.executeTool(ctx, call.name, call.input);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(result.data),
          ...(result.isError ? { is_error: true } : {}),
        });
      }
      history.push({ role: "user", content: results });
    }

    this.logger.warn(
      `Cap de ${MAX_TOOL_ROUNDS} rounds de ferramentas atingido (tenant ${ctx.tenantId}).`,
    );
    return "Não consegui concluir agora — pode repetir o que precisa, de forma mais direta?";
  }

  /** Executa a ferramenta pedida pela IA. TODA escrita passa pelos services já validados. */
  private async executeTool(
    ctx: ConversationContext,
    name: string,
    input: Record<string, unknown>,
  ): Promise<{ data: unknown; isError?: boolean }> {
    try {
      switch (name) {
        case "list_professionals": {
          const list = await this.org.listProfessionals(ctx.tenantId);
          return { data: list };
        }
        case "find_slots": {
          const professionalId = String(input.professionalId ?? "");
          const date = String(input.date ?? "");
          const openSlots = await this.slots.openSlots(
            ctx.tenantId,
            ctx.unitId,
            professionalId,
            date,
          );
          return {
            data: openSlots.map((s) => ({
              time: this.formatLocalTime(s.start, ctx.timezone),
              iso: s.start,
            })),
          };
        }
        case "book_appointment": {
          return await this.bookAppointment(ctx, input);
        }
        case "confirm_appointment": {
          return await this.confirmNextAppointment(ctx);
        }
        default:
          return {
            data: { error: `Ferramenta desconhecida: ${name}` },
            isError: true,
          };
      }
    } catch (err) {
      return { data: { error: (err as Error).message }, isError: true };
    }
  }

  private async bookAppointment(
    ctx: ConversationContext,
    input: Record<string, unknown>,
  ): Promise<{ data: unknown; isError?: boolean }> {
    const professionalId = String(input.professionalId ?? "");
    const date = String(input.date ?? "");
    const time = String(input.time ?? "");
    const startsAt = this.combineDateTime(date, time, ctx.timezone);
    if (!startsAt) {
      return { data: { error: "Data/hora inválidas." }, isError: true };
    }

    // RE-VALIDA no servidor (mesmo padrão do booking público S15a): o horário
    // tem que estar entre os efetivamente livres — nunca confia no que a IA propôs.
    const dateYmd = await this.slots.dateYmdInUnitTz(
      ctx.tenantId,
      ctx.unitId,
      startsAt,
    );
    const openSlots = dateYmd
      ? await this.slots.openSlots(
          ctx.tenantId,
          ctx.unitId,
          professionalId,
          dateYmd,
        )
      : [];
    const iso = startsAt.toISOString();
    if (!openSlots.some((s) => s.start === iso)) {
      return {
        data: { error: "Esse horário não está mais disponível." },
        isError: true,
      };
    }

    try {
      const end = new Date(startsAt.getTime() + 30 * 60_000);
      const appt = await this.appointments.create(ctx.tenantId, {
        unitId: ctx.unitId,
        professionalId,
        patientId: ctx.patientId,
        startsAt: iso,
        endsAt: end.toISOString(),
      });
      return {
        data: {
          appointmentId: appt.id,
          startsAt: appt.startsAt,
          status: appt.status,
        },
      };
    } catch (err) {
      // Conflito real-time (§4) — a IA deve informar e oferecer outro horário.
      return { data: { error: (err as Error).message }, isError: true };
    }
  }

  private async confirmNextAppointment(
    ctx: ConversationContext,
  ): Promise<{ data: unknown; isError?: boolean }> {
    const appt = await this.prisma.appointment.findFirst({
      where: {
        tenantId: ctx.tenantId,
        patientId: ctx.patientId,
        deletedAt: null,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
      select: { id: true },
    });
    if (!appt) {
      return {
        data: { error: "Não há consulta futura para confirmar." },
        isError: true,
      };
    }
    const result = await this.me.confirmAppointment(
      ctx.tenantId,
      ctx.patientId,
      appt.id,
      "WHATSAPP",
    );
    return { data: result };
  }

  /**
   * Resolve tenant/paciente/unidade pelo TELEFONE (nunca por id vindo de fora —
   * anti-IDOR). Mesma lógica de candidatos de DDI do webhook de confirmação
   * (S12b): o agente só atende quem já é paciente em algum tenant.
   */
  private async resolveContext(
    phone: string,
  ): Promise<ConversationContext | null> {
    const raw = phone.replace(/\D/g, "");
    if (!raw) return null;
    const candidates = new Set<string>([raw, raw.slice(-11), raw.slice(-10)]);
    if (raw.startsWith("55") && raw.length > 11) candidates.add(raw.slice(2));

    const patient = await this.prisma.patient.findFirst({
      where: { phone: { in: [...candidates] }, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!patient) return null;

    const unit = await this.prisma.unit.findFirst({
      where: { tenantId: patient.tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, timezone: true },
    });
    if (!unit) return null;

    return {
      tenantId: patient.tenantId,
      patientId: patient.id,
      unitId: unit.id,
      timezone: unit.timezone,
    };
  }

  private formatLocalTime(iso: string, timezone: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  /** Combina data (YYYY-MM-DD) + hora (HH:mm) NO FUSO da unidade → instante UTC (reusa o helper da S15). */
  private combineDateTime(
    date: string,
    time: string,
    timezone: string,
  ): Date | null {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
    if (!dateMatch || !timeMatch) return null;
    const [, y, mo, d] = dateMatch;
    const [, h, mi] = timeMatch;
    const minuteOfDay = Number(h) * 60 + Number(mi);
    return wallTimeToUtc(
      Number(y),
      Number(mo),
      Number(d),
      minuteOfDay,
      timezone,
    );
  }
}
