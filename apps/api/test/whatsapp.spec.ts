import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Job, Queue } from "bullmq";
import {
  ConfirmationSender,
  ConfirmationSenderProcessor,
  type ConfirmationJobData,
} from "../src/integrations/whatsapp/confirmation-sender";
import type { Env } from "../src/config/env.validation";
import { WhatsAppService } from "../src/integrations/whatsapp/whatsapp.service";

function makeConfig(
  values: Partial<Record<string, unknown>>,
): ConfigService<Env, true> {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService<Env, true>;
}

const CONFIGURED = {
  NODE_ENV: "development",
  EVOLUTION_API_URL: "https://evo.example.com",
  EVOLUTION_API_KEY: "secret-key",
  EVOLUTION_INSTANCE: "vero",
};

describe("WhatsAppService (S12a — proxy Evolution)", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("fail-closed: sem config → ServiceUnavailable", async () => {
    const svc = new WhatsAppService(makeConfig({ NODE_ENV: "development" }));
    await expect(svc.sendText("11999998888", "oi")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("envia: chama a base configurada, normaliza telefone e retorna o id", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: { id: "msg-123" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const svc = new WhatsAppService(makeConfig(CONFIGURED));
    const res = await svc.sendText("(11) 99999-8888", "Confirme sua consulta");

    expect(res).toEqual({ id: "msg-123" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://evo.example.com/message/sendText/vero");
    expect(init.headers.apikey).toBe("secret-key");
    const body = JSON.parse(init.body);
    expect(body.number).toBe("11999998888"); // só dígitos
    expect(body.text).toBe("Confirme sua consulta");
  });

  it("erro HTTP da Evolution → lança (worker fará retry/DLQ)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const svc = new WhatsAppService(makeConfig(CONFIGURED));
    await expect(svc.sendText("11999998888", "oi")).rejects.toThrow(/HTTP 500/);
  });

  it("anti-SSRF: em produção, base apontando p/ host interno → bloqueia", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const svc = new WhatsAppService(
      makeConfig({
        ...CONFIGURED,
        NODE_ENV: "production",
        EVOLUTION_API_URL: "http://169.254.169.254",
      }),
    );
    await expect(svc.sendText("11999998888", "oi")).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("ConfirmationSender (S12a — producer idempotente)", () => {
  it("scheduleD1: jobId determinístico por agendamento + delay p/ D-1", async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const sender = new ConfirmationSender({
      add,
    } as unknown as Queue<ConfirmationJobData>);

    const data: ConfirmationJobData = {
      tenantId: "t1",
      appointmentId: "a1",
      patientId: "p1",
      phone: "11999998888",
      text: "Confirme",
    };
    const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48h → D-1 ~ +24h
    await sender.scheduleD1(data, startsAt);

    expect(add).toHaveBeenCalledTimes(1);
    const [name, payload, opts] = add.mock.calls[0];
    expect(name).toBe("send");
    expect(payload).toEqual(data);
    expect(opts.jobId).toBe("confirm-a1"); // idempotência (sem ":", reservado pelo BullMQ)
    expect(opts.delay).toBeGreaterThan(0);
  });
});

describe("ConfirmationSenderProcessor (S12a — DLQ)", () => {
  function build() {
    const dlqAdd = jest.fn().mockResolvedValue(undefined);
    const whatsapp = { sendText: jest.fn() } as unknown as WhatsAppService;
    const proc = new ConfirmationSenderProcessor(whatsapp, {
      add: dlqAdd,
    } as unknown as Queue);
    return { proc, dlqAdd };
  }

  it("falha com retries restantes → NÃO vai p/ DLQ", async () => {
    const { proc, dlqAdd } = build();
    const job = {
      id: "j1",
      data: {},
      opts: { attempts: 5 },
      attemptsMade: 2,
    } as unknown as Job<ConfirmationJobData>;
    await proc.onFailed(job, new Error("timeout"));
    expect(dlqAdd).not.toHaveBeenCalled();
  });

  it("falha após esgotar tentativas → DLQ com payload + erro", async () => {
    const { proc, dlqAdd } = build();
    const job = {
      id: "j1",
      data: { appointmentId: "a1", phone: "x", text: "y" },
      opts: { attempts: 5 },
      attemptsMade: 5,
    } as unknown as Job<ConfirmationJobData>;
    await proc.onFailed(job, new Error("boom"));
    expect(dlqAdd).toHaveBeenCalledTimes(1);
    const [name, payload] = dlqAdd.mock.calls[0];
    expect(name).toBe("dead-letter");
    expect(payload.error).toBe("boom");
    expect(payload.originalJobId).toBe("j1");
  });
});
