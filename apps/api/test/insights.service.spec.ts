import { InsightsService } from "../src/ai/insights.service";
import type { AnthropicService } from "../src/integrations/anthropic/anthropic.service";
import type { CrmService } from "../src/crm/crm.service";
import type { DashboardService } from "../src/analytics/dashboard.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";

const DASHBOARD_DATA = {
  cached: false,
  period: { from: "2026-07-01T00:00:00.000Z", to: "2026-07-31T00:00:00.000Z" },
  kpis: {
    revenueCents: 10000,
    billedCents: 20000,
    appointmentsCount: 10,
    conversionPercent: 70,
    approvedBudgets: 7,
    rejectedBudgets: 3,
  },
  series: [],
  generatedAt: "2026-07-31T00:00:00.000Z",
};

function build(opts?: {
  configured?: boolean;
  createMessage?: jest.Mock;
  redisStore?: Map<string, string>;
  availability?: unknown[];
  appointments?: unknown[];
  installments?: unknown[];
  channels?: unknown[];
}) {
  const redisStore = opts?.redisStore ?? new Map<string, string>();
  const redis = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve("OK");
    }),
    keys: jest.fn((pattern: string) => {
      const prefix = pattern.replace("*", "");
      return Promise.resolve(
        [...redisStore.keys()].filter((k) => k.startsWith(prefix)),
      );
    }),
    del: jest.fn((...keys: string[]) => {
      for (const k of keys) redisStore.delete(k);
      return Promise.resolve(keys.length);
    }),
  } as unknown as RedisService;

  const prisma = {
    availability: {
      findMany: jest.fn().mockResolvedValue(
        opts?.availability ?? [
          { dayOfWeek: 1, startMinute: 8 * 60, endMinute: 12 * 60 }, // 4h/semana, segundas
        ],
      ),
    },
    appointment: {
      findMany: jest.fn().mockResolvedValue(opts?.appointments ?? []),
    },
    installment: {
      findMany: jest.fn().mockResolvedValue(opts?.installments ?? []),
    },
  } as unknown as PrismaService;

  const dashboard = {
    getDashboard: jest.fn().mockResolvedValue(DASHBOARD_DATA),
  } as unknown as DashboardService;

  const crm = {
    reportBySource: jest.fn().mockResolvedValue(
      opts?.channels ?? [
        {
          sourceId: "s1",
          name: "Instagram",
          costCents: 30000,
          leads: 10,
          closed: 4,
          revenueCents: 80000,
          roiCents: 50000,
        },
      ],
    ),
  } as unknown as CrmService;

  const anthropic = {
    configured: opts?.configured ?? true,
    createMessage:
      opts?.createMessage ?? jest.fn().mockResolvedValue(textResponse("[]")),
  } as unknown as AnthropicService;

  const service = new InsightsService(prisma, redis, dashboard, crm, anthropic);
  return { service, redis, prisma, dashboard, crm, anthropic };
}

function textResponse(text: string) {
  return { content: [{ type: "text", text }], stop_reason: "end_turn" };
}

describe("InsightsService (S51)", () => {
  it("sem IA configurada: métricas calculadas normalmente, insights vazio (aiAvailable=false)", async () => {
    const { service, anthropic } = build({ configured: false });
    const result = await service.generate("tenant-1");
    expect(result.aiAvailable).toBe(false);
    expect(result.insights).toEqual([]);
    expect(result.metrics.conversion.percent).toBe(70);
    expect(anthropic.createMessage).not.toHaveBeenCalled();
  });

  it("cache: 2ª chamada dentro do período usa o cache (não recalcula nem chama a IA de novo)", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValue(
        textResponse(
          '[{"type":"conversao","title":"t","explanation":"e","suggestion":"s"}]',
        ),
      );
    const { service, dashboard } = build({ createMessage });

    const first = await service.generate("tenant-1", {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });
    expect(first.cached).toBe(false);

    const second = await service.generate("tenant-1", {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });
    expect(second.cached).toBe(true);
    expect(dashboard.getDashboard).toHaveBeenCalledTimes(1); // só na 1ª
    expect(createMessage).toHaveBeenCalledTimes(1); // só na 1ª (custo de IA)
  });

  it("cache com período PADRÃO (sem from/to, o caso comum da tela web) também bate", async () => {
    // Regressão: "to" default não pode usar new Date() cru (muda a cada ms e
    // nunca bateria o cache) — precisa arredondar (p/ hora) p/ o TTL valer.
    const createMessage = jest.fn().mockResolvedValue(textResponse("[]"));
    const { service, dashboard } = build({ createMessage });

    const first = await service.generate("tenant-1");
    expect(first.cached).toBe(false);

    const second = await service.generate("tenant-1");
    expect(second.cached).toBe(true);
    expect(dashboard.getDashboard).toHaveBeenCalledTimes(1);
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it("ocupação: calcula minutos agendados / capacidade a partir de Availability", async () => {
    // 1 segunda-feira no período com janela 08:00-12:00 (240min de capacidade).
    const { service } = build({
      availability: [{ dayOfWeek: 1, startMinute: 8 * 60, endMinute: 12 * 60 }],
      appointments: [
        {
          startsAt: new Date("2026-07-06T11:00:00Z"),
          endsAt: new Date("2026-07-06T11:30:00Z"),
        }, // 30min
      ],
    });
    const result = await service.generate("tenant-1", {
      from: "2026-07-06T00:00:00.000Z",
      to: "2026-07-06T23:59:59.000Z",
    });
    // 1 ocorrência de segunda no período -> capacidade 240min; agendado 30min -> 13%.
    expect(result.metrics.occupancy.capacityMinutes).toBe(240);
    expect(result.metrics.occupancy.bookedMinutes).toBe(30);
    expect(result.metrics.occupancy.percent).toBe(13);
  });

  it("inadimplência: parcela PENDING vencida conta como inadimplente; PAID não conta", async () => {
    const { service } = build({
      installments: [
        {
          status: "PENDING",
          dueDate: new Date("2026-07-01"),
          amountCents: 5000,
        },
        { status: "PAID", dueDate: new Date("2026-07-05"), amountCents: 3000 },
      ],
    });
    const result = await service.generate("tenant-1", {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });
    expect(result.metrics.delinquency.dueCount).toBe(2);
    expect(result.metrics.delinquency.overdueCount).toBe(1);
    expect(result.metrics.delinquency.overdueCents).toBe(5000);
    expect(result.metrics.delinquency.percent).toBe(50);
  });

  it("nunca envia dado de paciente à IA — só números agregados e nomes de canal", async () => {
    const createMessage = jest.fn().mockResolvedValue(textResponse("[]"));
    const { service } = build({ createMessage });

    await service.generate("tenant-1");

    // Só o conteúdo de DADOS enviado (não o prompt de sistema, que legitimamente
    // FALA em "não enviar dados de paciente" como instrução) precisa estar limpo.
    const call = createMessage.mock.calls[0][0];
    const userContent = JSON.stringify(call.messages);
    expect(userContent).not.toMatch(/cpf|telefone|@|nome:/i);
    expect(userContent).toContain("Instagram"); // nome de canal é permitido
  });

  it("resposta da IA em JSON malformado: devolve insights vazio sem lançar", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValue(textResponse("não é json"));
    const { service } = build({ createMessage });
    const result = await service.generate("tenant-1");
    expect(result.insights).toEqual([]);
  });

  it("parseia JSON mesmo dentro de um bloco ```json", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValue(
        textResponse(
          '```json\n[{"type":"ocupacao","title":"t","explanation":"e","suggestion":"s"}]\n```',
        ),
      );
    const { service } = build({ createMessage });
    const result = await service.generate("tenant-1");
    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]?.type).toBe("ocupacao");
  });

  it("invalidate limpa só as chaves do tenant", async () => {
    const store = new Map<string, string>([
      ["insights:tenant-1:a:b", "{}"],
      ["insights:tenant-2:a:b", "{}"],
    ]);
    const { service, redis } = build({ redisStore: store });
    const result = await service.invalidate("tenant-1");
    expect(result.cleared).toBe(1);
    expect(redis.del).toHaveBeenCalledWith("insights:tenant-1:a:b");
    expect(store.has("insights:tenant-2:a:b")).toBe(true);
  });
});
