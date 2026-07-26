import type { AgentService } from "../src/ai/agent.service";
import type { MeService } from "../src/me/me.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";
import type { WhatsAppService } from "../src/integrations/whatsapp/whatsapp.service";
import {
  type EvolutionWebhookPayload,
  WhatsAppWebhookService,
} from "../src/integrations/whatsapp/whatsapp-webhook.service";

function payload(
  text: string | undefined,
  opts: { id?: string; jid?: string; fromMe?: boolean } = {},
): EvolutionWebhookPayload {
  return {
    data: {
      key: {
        id: opts.id ?? "evt-1",
        remoteJid: opts.jid ?? "5511999998888@s.whatsapp.net",
        fromMe: opts.fromMe ?? false,
      },
      message: text === undefined ? {} : { conversation: text },
    },
  };
}

function build(
  opts: {
    fresh?: boolean;
    appt?: { id: string; tenantId: string; patientId: string } | null;
    agentReply?: string | null;
  } = {},
) {
  const { fresh = true, appt = null, agentReply = null } = opts;
  const set = jest.fn().mockResolvedValue(fresh ? "OK" : null);
  const findFirst = jest.fn().mockResolvedValue(appt);
  const confirmAppointment = jest.fn().mockResolvedValue({
    id: "a1",
    status: "CONFIRMED",
    alreadyConfirmed: false,
  });
  const handleMessage = jest.fn().mockResolvedValue(agentReply);
  const sendText = jest.fn().mockResolvedValue({ id: "msg-1" });
  const svc = new WhatsAppWebhookService(
    { appointment: { findFirst } } as unknown as PrismaService,
    { set } as unknown as RedisService,
    { confirmAppointment } as unknown as MeService,
    { handleMessage } as unknown as AgentService,
    { sendText } as unknown as WhatsAppService,
  );
  return { svc, set, findFirst, confirmAppointment, handleMessage, sendText };
}

describe("WhatsAppWebhookService (S12b + agente S50)", () => {
  const APPT = { id: "a1", tenantId: "t1", patientId: "p1" };

  it("confirma: evento novo + texto afirmativo + consulta encontrada → WHATSAPP (não chama o agente)", async () => {
    const { svc, confirmAppointment, handleMessage } = build({ appt: APPT });
    const out = await svc.handleInbound(payload("Sim"));
    expect(out).toBe("confirmed");
    expect(confirmAppointment).toHaveBeenCalledWith(
      "t1",
      "p1",
      "a1",
      "WHATSAPP",
    );
    expect(handleMessage).not.toHaveBeenCalled();
  });

  it("idempotente: id de evento repetido (SETNX falha) → duplicate, não reconfirma nem chama o agente", async () => {
    const { svc, confirmAppointment, findFirst, handleMessage } = build({
      fresh: false,
      appt: APPT,
    });
    const out = await svc.handleInbound(payload("Sim"));
    expect(out).toBe("duplicate");
    expect(findFirst).not.toHaveBeenCalled();
    expect(confirmAppointment).not.toHaveBeenCalled();
    expect(handleMessage).not.toHaveBeenCalled();
  });

  it("texto não afirmativo, agente sem chave configurada (null) → ignored", async () => {
    const { svc, confirmAppointment, handleMessage } = build({
      appt: APPT,
      agentReply: null,
    });
    const out = await svc.handleInbound(payload("não posso ir"));
    expect(out).toBe("ignored");
    expect(confirmAppointment).not.toHaveBeenCalled();
    expect(handleMessage).toHaveBeenCalledWith("5511999998888", "não posso ir");
  });

  it("mensagem própria (fromMe) → ignored sem tocar Redis nem o agente", async () => {
    const { svc, set, handleMessage } = build({ appt: APPT });
    const out = await svc.handleInbound(payload("Sim", { fromMe: true }));
    expect(out).toBe("ignored");
    expect(set).not.toHaveBeenCalled();
    expect(handleMessage).not.toHaveBeenCalled();
  });

  it("afirmativo mas sem consulta SCHEDULED → cai no agente (não é mais 'no-match')", async () => {
    const { svc, confirmAppointment, handleMessage } = build({
      appt: null,
      agentReply:
        "Não encontrei uma consulta para confirmar. Quer marcar uma nova?",
    });
    const out = await svc.handleInbound(payload("confirmo"));
    expect(out).toBe("agent-handled");
    expect(confirmAppointment).not.toHaveBeenCalled();
    expect(handleMessage).toHaveBeenCalledWith("5511999998888", "confirmo");
  });

  it("agente responde (S50): envia a resposta via WhatsAppService e devolve agent-handled", async () => {
    const { svc, sendText } = build({
      appt: null,
      agentReply: "🤖 ... Temos horário terça às 10h, confirma?",
    });
    const out = await svc.handleInbound(payload("quero marcar uma consulta"));
    expect(out).toBe("agent-handled");
    expect(sendText).toHaveBeenCalledWith(
      "5511999998888",
      "🤖 ... Temos horário terça às 10h, confirma?",
    );
  });

  it("casa telefone por candidatos (remove DDI 55 do JID)", async () => {
    const { svc, findFirst } = build({ appt: APPT });
    await svc.handleInbound(
      payload("1", { jid: "5511999998888@s.whatsapp.net" }),
    );
    const where = findFirst.mock.calls[0][0].where;
    expect(where.patient.phone.in).toContain("11999998888"); // sem DDI
    expect(where.status).toBe("SCHEDULED");
  });
});
