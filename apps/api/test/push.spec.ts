import type { ConfigService } from "@nestjs/config";
import type { Job, Queue } from "bullmq";
import type { Env } from "../src/config/env.validation";
import { PushSenderProcessor, type NotifyInput } from "../src/push/push-sender";
import { PushService } from "../src/push/push.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function makeConfig(
  values: Partial<Record<string, unknown>>,
): ConfigService<Env, true> {
  return { get: (k: string) => values[k] } as unknown as ConfigService<
    Env,
    true
  >;
}

describe("PushService (S13b — proxy Expo)", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("lote vazio → não chama o Expo", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const svc = new PushService(makeConfig({}));
    expect(await svc.send([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia e retorna tickets; usa Bearer quando há EXPO_ACCESS_TOKEN", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok", id: "t1" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const svc = new PushService(makeConfig({ EXPO_ACCESS_TOKEN: "secret" }));
    const tickets = await svc.send([
      { to: "ExponentPushToken[a]", title: "Oi", body: "Corpo" },
    ]);
    expect(tickets).toEqual([{ status: "ok", id: "t1" }]);
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
      "Bearer secret",
    );
  });

  it("erro HTTP do Expo → lança (worker fará retry/DLQ)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch;
    const svc = new PushService(makeConfig({}));
    await expect(
      svc.send([{ to: "ExponentPushToken[a]", title: "t", body: "b" }]),
    ).rejects.toThrow(/HTTP 502/);
  });
});

describe("PushSenderProcessor (S13b)", () => {
  function build(opts: {
    notif?: Record<string, unknown> | null;
    tokens?: { token: string }[];
    tickets?: { status: string; id?: string; details?: { error?: string } }[];
  }) {
    const findUnique = jest.fn().mockResolvedValue(opts.notif ?? null);
    const findMany = jest.fn().mockResolvedValue(opts.tokens ?? []);
    const update = jest.fn().mockResolvedValue({});
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const send = jest.fn().mockResolvedValue(opts.tickets ?? []);
    const dlqAdd = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      notification: { findUnique, update },
      deviceToken: { findMany, deleteMany },
    } as unknown as PrismaService;
    const proc = new PushSenderProcessor(
      prisma,
      { send } as unknown as PushService,
      { add: dlqAdd } as unknown as Queue,
    );
    return { proc, findMany, update, deleteMany, send, dlqAdd };
  }

  const job = (id = "n1") =>
    ({ data: { notificationId: id } }) as unknown as Job<{
      notificationId: string;
    }>;

  it("idempotente: notification já SENT → no-op, não envia", async () => {
    const { proc, send } = build({ notif: { id: "n1", status: "SENT" } });
    const r = await proc.process(job());
    expect(r.outcome).toBe("already-sent");
    expect(send).not.toHaveBeenCalled();
  });

  it("sem token (ou todos opt-out) → marca SKIPPED, não envia", async () => {
    const { proc, send, update } = build({
      notif: { id: "n1", status: "PENDING", tenantId: "t1", patientId: "p1" },
      tokens: [],
    });
    const r = await proc.process(job());
    expect(r.outcome).toBe("no-tokens");
    expect(send).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].data.status).toBe("SKIPPED");
  });

  it("envia e marca SENT; remove token DeviceNotRegistered", async () => {
    const { proc, deleteMany, update } = build({
      notif: {
        id: "n1",
        status: "PENDING",
        tenantId: "t1",
        patientId: "p1",
        title: "Lembrete",
        body: "Amanhã 14h",
        data: null,
      },
      tokens: [
        { token: "ExponentPushToken[ok]" },
        { token: "ExponentPushToken[dead]" },
      ],
      tickets: [
        { status: "ok", id: "x" },
        { status: "error", details: { error: "DeviceNotRegistered" } },
      ],
    });
    const r = await proc.process(job());
    expect(r.outcome).toBe("sent");
    expect(deleteMany.mock.calls[0][0].where.token.in).toEqual([
      "ExponentPushToken[dead]",
    ]);
    expect(update.mock.calls[0][0].data.status).toBe("SENT");
  });

  it("opt-out respeitado: findMany filtra optedOut:false do destinatário", async () => {
    const { proc, findMany } = build({
      notif: { id: "n1", status: "PENDING", tenantId: "t1", patientId: "p1" },
      tokens: [],
    });
    await proc.process(job());
    expect(findMany.mock.calls[0][0].where).toEqual({
      tenantId: "t1",
      patientId: "p1",
      optedOut: false,
    });
  });

  it("falha após esgotar tentativas → DLQ + Notification FAILED", async () => {
    const { proc, dlqAdd, update } = build({ notif: null });
    const failedJob = {
      id: "j1",
      data: { notificationId: "n1" },
      opts: { attempts: 5 },
      attemptsMade: 5,
    } as unknown as Job<{ notificationId: string }>;
    await proc.onFailed(failedJob, new Error("boom"));
    expect(dlqAdd).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.status).toBe("FAILED");
  });
});

// Garante que o tipo NotifyInput aceita os dois tipos de destinatário (compilação).
const _patientRecipient: NotifyInput = {
  recipient: { tenantId: "t1", patientId: "p1" },
  type: "REMINDER",
  title: "x",
  body: "y",
};
void _patientRecipient;
