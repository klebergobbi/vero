import { AgentService } from "../src/ai/agent.service";
import type { AnthropicResponse } from "../src/integrations/anthropic/anthropic.service";
import type { AnthropicService } from "../src/integrations/anthropic/anthropic.service";
import type { AppointmentService } from "../src/appointment/appointment.service";
import type { MeService } from "../src/me/me.service";
import type { OrgService } from "../src/org/org.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";
import type { SlotService } from "../src/appointment/slot.service";

const PATIENT = { id: "pat-1", tenantId: "tenant-1" };
const UNIT = { id: "unit-1", timezone: "America/Sao_Paulo" };

function textResponse(text: string): AnthropicResponse {
  return { content: [{ type: "text", text }], stop_reason: "end_turn" };
}

function toolUseResponse(
  name: string,
  input: Record<string, unknown>,
  id = "call-1",
): AnthropicResponse {
  return {
    content: [{ type: "tool_use", id, name, input }],
    stop_reason: "tool_use",
  };
}

function build(opts?: {
  createMessage?: jest.Mock;
  configured?: boolean;
  patient?: unknown;
  redisGet?: jest.Mock;
}) {
  const anthropic = {
    configured: opts?.configured ?? true,
    createMessage: opts?.createMessage ?? jest.fn(),
  } as unknown as AnthropicService;

  const redisStore = new Map<string, string>();
  const redis = {
    get:
      opts?.redisGet ??
      jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve("OK");
    }),
  } as unknown as RedisService;

  const prisma = {
    patient: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          opts?.patient === undefined ? PATIENT : opts.patient,
        ),
    },
    unit: { findFirst: jest.fn().mockResolvedValue(UNIT) },
    appointment: { findFirst: jest.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;

  const slots = {
    openSlots: jest
      .fn()
      .mockResolvedValue([
        { start: "2026-08-10T13:00:00.000Z", end: "2026-08-10T13:30:00.000Z" },
      ]),
    dateYmdInUnitTz: jest.fn().mockResolvedValue("2026-08-10"),
  } as unknown as SlotService;

  const appointments = {
    create: jest.fn().mockResolvedValue({
      id: "appt-1",
      startsAt: "2026-08-10T13:00:00.000Z",
      status: "SCHEDULED",
    }),
  } as unknown as AppointmentService;

  const org = {
    listProfessionals: jest
      .fn()
      .mockResolvedValue([{ id: "prof-1", name: "Dr. Ana" }]),
  } as unknown as OrgService;

  const me = {
    confirmAppointment: jest
      .fn()
      .mockResolvedValue({ id: "appt-1", status: "CONFIRMED" }),
  } as unknown as MeService;

  const service = new AgentService(
    anthropic,
    redis,
    prisma,
    slots,
    appointments,
    org,
    me,
  );
  return { service, anthropic, redis, prisma, slots, appointments, org, me };
}

describe("AgentService", () => {
  it("sem IA configurada, não chama a API e devolve null (fallback simples assume)", async () => {
    const { service, anthropic } = build({ configured: false });
    const reply = await service.handleMessage("5511999990000", "oi");
    expect(reply).toBeNull();
    expect(anthropic.createMessage).not.toHaveBeenCalled();
  });

  it("telefone desconhecido: não chama a IA (guarda de custo) e orienta a procurar a recepção", async () => {
    const { service, anthropic } = build({ patient: null });
    const reply = await service.handleMessage("5511999990000", "quero marcar");
    expect(reply).toMatch(/não encontrei seu cadastro/i);
    expect(anthropic.createMessage).not.toHaveBeenCalled();
  });

  it("disclosure de IA aparece SÓ na primeira mensagem da conversa", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValue(textResponse("Olá! Como posso ajudar?"));
    const { service } = build({ createMessage });

    const first = await service.handleMessage("5511999990000", "oi");
    expect(first).toMatch(/assistente virtual do Vero/);

    const second = await service.handleMessage(
      "5511999990000",
      "quero marcar consulta",
    );
    expect(second).not.toMatch(/assistente virtual do Vero/);
  });

  it("guardrail: book_appointment SEMPRE passa por AppointmentService.create (nunca escreve direto)", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValueOnce(
        toolUseResponse("book_appointment", {
          professionalId: "prof-1",
          date: "2026-08-10",
          time: "10:00",
        }),
      )
      .mockResolvedValueOnce(textResponse("Consulta marcada!"));
    const { service, appointments, slots } = build({ createMessage });

    const reply = await service.handleMessage(
      "5511999990000",
      "pode marcar terça 10h",
    );

    expect(slots.openSlots).toHaveBeenCalled(); // re-validação server-side
    expect(appointments.create).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ patientId: "pat-1", professionalId: "prof-1" }),
    );
    expect(reply).toMatch(/Consulta marcada/);
  });

  it("guardrail: se o horário não está mais livre, NÃO chama AppointmentService.create e reporta erro à IA", async () => {
    // Captura um snapshot (deep clone) dos args NO MOMENTO da chamada — `history`
    // é mutado depois, então guardar a referência crua daria falso negativo.
    const snapshots: unknown[] = [];
    const responses = [
      toolUseResponse("book_appointment", {
        professionalId: "prof-1",
        date: "2026-08-10",
        time: "16:00", // fora dos slots livres mockados (13:00)
      }),
      textResponse("Esse horário não está mais livre, que tal outro?"),
    ];
    const createMessage = jest.fn((args: unknown) => {
      snapshots.push(JSON.parse(JSON.stringify(args)));
      return Promise.resolve(responses[snapshots.length - 1]);
    });
    const { service, appointments } = build({ createMessage });

    await service.handleMessage("5511999990000", "pode marcar 16h");

    expect(appointments.create).not.toHaveBeenCalled();
    // a 2ª chamada à IA recebeu, nas mensagens, o tool_result de erro do round 1.
    const secondCallArgs = snapshots[1] as {
      messages: { content: unknown[] }[];
    };
    const toolResultMsg = secondCallArgs.messages.at(-1)!;
    const toolResult = toolResultMsg.content[0] as { is_error?: boolean };
    expect(toolResult.is_error).toBe(true);
  });

  it("cap de rounds de ferramentas evita loop indefinido", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValue(toolUseResponse("list_professionals", {}));
    const { service } = build({ createMessage });

    const reply = await service.handleMessage("5511999990000", "oi");

    expect(createMessage).toHaveBeenCalledTimes(4); // MAX_TOOL_ROUNDS
    expect(reply).toMatch(/Não consegui concluir/);
  });

  it("confirm_appointment sem consulta futura reporta erro (não chama MeService)", async () => {
    const createMessage = jest
      .fn()
      .mockResolvedValueOnce(toolUseResponse("confirm_appointment", {}))
      .mockResolvedValueOnce(
        textResponse("Não encontrei nenhuma consulta futura."),
      );
    const { service, me } = build({ createMessage });

    const reply = await service.handleMessage(
      "5511999990000",
      "confirmar presença",
    );

    expect(me.confirmAppointment).not.toHaveBeenCalled();
    expect(reply).toMatch(/não encontrei/i);
  });
});
