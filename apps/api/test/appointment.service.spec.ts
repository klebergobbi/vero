import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { localDayAndMinute, overlaps } from "../src/appointment/agenda.util";
import { AppointmentService } from "../src/appointment/appointment.service";
import type { CreateAppointmentDto } from "../src/appointment/dto/create-appointment.dto";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("agenda.util", () => {
  it("overlaps detecta sobreposição de intervalos", () => {
    const d = (h: number) =>
      new Date(`2026-06-08T${String(h).padStart(2, "0")}:00:00Z`);
    expect(overlaps(d(9), d(10), d(9), d(10))).toBe(true); // idênticos
    expect(overlaps(d(9), d(11), d(10), d(12))).toBe(true); // parcial
    expect(overlaps(d(9), d(10), d(10), d(11))).toBe(false); // encostados (fim=início)
    expect(overlaps(d(9), d(10), d(11), d(12))).toBe(false); // separados
  });

  it("localDayAndMinute converte UTC para o fuso da unidade (America/Sao_Paulo, UTC-3)", () => {
    // 16:00Z = 13:00 local → 780 min; 13:00Z = 10:00 local → 600 min.
    expect(
      localDayAndMinute(new Date("2026-06-08T16:00:00Z"), "America/Sao_Paulo")
        .minute,
    ).toBe(780);
    expect(
      localDayAndMinute(new Date("2026-06-08T13:00:00Z"), "America/Sao_Paulo")
        .minute,
    ).toBe(600);
  });
});

describe("AppointmentService", () => {
  const dto: CreateAppointmentDto = {
    unitId: "unit-1",
    professionalId: "prof-1",
    patientId: "pat-1",
    startsAt: "2026-06-08T13:00:00Z", // 10:00 local SP
    endsAt: "2026-06-08T14:00:00Z", // 11:00 local SP
  };

  function build(opts?: {
    availability?: unknown[];
    apptFindFirst?: jest.Mock;
  }) {
    const prisma = {
      unit: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "unit-1", timezone: "America/Sao_Paulo" }),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
      patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1" }) },
      availability: {
        findMany: jest.fn().mockResolvedValue(opts?.availability ?? []),
      },
      appointment: {
        findFirst: opts?.apptFindFirst ?? jest.fn().mockResolvedValue(null),
        create: jest.fn((a: { data: unknown }) =>
          Promise.resolve({ id: "appt-1", ...(a.data as object) }),
        ),
        update: jest.fn((a: { data: unknown }) =>
          Promise.resolve({ id: "appt-1", ...(a.data as object) }),
        ),
      },
    } as unknown as PrismaService;
    const apiKeys = { deliverEvent: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new AppointmentService(
        prisma,
        apiKeys as unknown as import("../src/public-api/api-key.service").ApiKeyService,
      ),
      prisma,
    };
  }

  it("cria agendamento válido escopado por tenant", async () => {
    const { service, prisma } = build();
    const result = await service.create("tenant-A", dto);
    expect(result).toMatchObject({ id: "appt-1" });
    expect((prisma.appointment.create as jest.Mock).mock.calls[0][0]).toEqual({
      data: expect.objectContaining({
        tenantId: "tenant-A",
        professionalId: "prof-1",
        status: "SCHEDULED",
      }),
    });
  });

  it("CONFLITO: marcar em horário ocupado do profissional → 409", async () => {
    const apptFindFirst = jest.fn().mockResolvedValue({ id: "existente" });
    const { service } = build({ apptFindFirst });
    await expect(service.create("tenant-A", dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it("rejeita intervalo inválido (startsAt >= endsAt) → 400", async () => {
    const { service } = build();
    await expect(
      service.create("tenant-A", {
        ...dto,
        startsAt: "2026-06-08T14:00:00Z",
        endsAt: "2026-06-08T13:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("disponibilidade: fora da janela definida → 400; dentro → ok", async () => {
    // Janela 09:00–12:00 local (540–720). dto está 10:00–11:00 → cabe.
    const dentro = build({
      availability: [{ startMinute: 540, endMinute: 720 }],
    });
    await expect(dentro.service.create("tenant-A", dto)).resolves.toMatchObject(
      {
        id: "appt-1",
      },
    );

    // Mesmo profissional às 13:00–14:00 local (780–840) → fora da janela.
    const fora = build({
      availability: [{ startMinute: 540, endMinute: 720 }],
    });
    await expect(
      fora.service.create("tenant-A", {
        ...dto,
        startsAt: "2026-06-08T16:00:00Z",
        endsAt: "2026-06-08T17:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("ANTI-IDOR: findOne de agendamento de outro tenant → 403", async () => {
    const apptFindFirst = jest.fn().mockResolvedValue(null); // não aparece no escopo
    const { service } = build({ apptFindFirst });
    await expect(service.findOne("tenant-A", "appt-de-B")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("move: novo horário conflitante (excluindo o próprio) → 409", async () => {
    const apptFindFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: "appt-1",
        professionalId: "prof-1",
        unitId: "unit-1",
        roomId: null,
      }) // findOne
      .mockResolvedValueOnce({ id: "outro" }); // conflito
    const { service } = build({ apptFindFirst });
    await expect(
      service.move("tenant-A", "appt-1", {
        startsAt: "2026-06-08T13:00:00Z",
        endsAt: "2026-06-08T14:00:00Z",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("cancel marca status CANCELLED (libera o horário)", async () => {
    const apptFindFirst = jest
      .fn()
      .mockResolvedValue({ id: "appt-1", professionalId: "prof-1" });
    const { service, prisma } = build({ apptFindFirst });
    await service.cancel("tenant-A", "appt-1");
    expect((prisma.appointment.update as jest.Mock).mock.calls[0][0]).toEqual({
      where: { id: "appt-1" },
      data: { status: "CANCELLED" },
    });
  });
});
