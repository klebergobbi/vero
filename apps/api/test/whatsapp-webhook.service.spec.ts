import type { MeService } from "../src/me/me.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";
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
  } = {},
) {
  const { fresh = true, appt = null } = opts;
  const set = jest.fn().mockResolvedValue(fresh ? "OK" : null);
  const findFirst = jest.fn().mockResolvedValue(appt);
  const confirmAppointment = jest.fn().mockResolvedValue({
    id: "a1",
    status: "CONFIRMED",
    alreadyConfirmed: false,
  });
  const svc = new WhatsAppWebhookService(
    { appointment: { findFirst } } as unknown as PrismaService,
    { set } as unknown as RedisService,
    { confirmAppointment } as unknown as MeService,
  );
  return { svc, set, findFirst, confirmAppointment };
}

describe("WhatsAppWebhookService (S12b)", () => {
  const APPT = { id: "a1", tenantId: "t1", patientId: "p1" };

  it("confirma: evento novo + texto afirmativo + consulta encontrada → WHATSAPP", async () => {
    const { svc, confirmAppointment } = build({ appt: APPT });
    const out = await svc.handleInbound(payload("Sim"));
    expect(out).toBe("confirmed");
    expect(confirmAppointment).toHaveBeenCalledWith(
      "t1",
      "p1",
      "a1",
      "WHATSAPP",
    );
  });

  it("idempotente: id de evento repetido (SETNX falha) → duplicate, não reconfirma", async () => {
    const { svc, confirmAppointment, findFirst } = build({
      fresh: false,
      appt: APPT,
    });
    const out = await svc.handleInbound(payload("Sim"));
    expect(out).toBe("duplicate");
    expect(findFirst).not.toHaveBeenCalled();
    expect(confirmAppointment).not.toHaveBeenCalled();
  });

  it("texto não afirmativo → ignored, não confirma", async () => {
    const { svc, confirmAppointment } = build({ appt: APPT });
    const out = await svc.handleInbound(payload("não posso ir"));
    expect(out).toBe("ignored");
    expect(confirmAppointment).not.toHaveBeenCalled();
  });

  it("mensagem própria (fromMe) → ignored sem tocar Redis", async () => {
    const { svc, set } = build({ appt: APPT });
    const out = await svc.handleInbound(payload("Sim", { fromMe: true }));
    expect(out).toBe("ignored");
    expect(set).not.toHaveBeenCalled();
  });

  it("afirmativo mas sem consulta SCHEDULED → no-match", async () => {
    const { svc, confirmAppointment } = build({ appt: null });
    const out = await svc.handleInbound(payload("confirmo"));
    expect(out).toBe("no-match");
    expect(confirmAppointment).not.toHaveBeenCalled();
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
