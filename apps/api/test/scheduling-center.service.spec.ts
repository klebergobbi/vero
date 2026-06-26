import { ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppointmentService } from "../src/appointment/appointment.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { SchedulingCenterService } from "../src/network/scheduling-center.service";

const TENANT = "tenant-1";
const USER = "user-1";
const UNIT_A = "unit-a";
const UNIT_B = "unit-b";

const appt = (unitId: string) => ({
  id: `appt-${unitId}`,
  unitId,
  unit: { name: unitId === UNIT_A ? "Matriz" : "Filial" },
  professionalId: "prof-1",
  professional: { name: "Dr. João" },
  patientId: "pat-1",
  patient: { name: "Paciente Demo", phone: "11999998888" },
  startsAt: new Date("2026-07-01T14:00:00Z"),
  endsAt: new Date("2026-07-01T14:30:00Z"),
  status: "SCHEDULED",
  markers: [],
  notes: null,
});

describe("SchedulingCenterService", () => {
  let service: SchedulingCenterService;
  let prisma: Record<string, jest.Mock>;
  let appointments: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      userUnit: { findMany: jest.fn(), findFirst: jest.fn() },
      appointment: { findMany: jest.fn() },
    };
    appointments = { create: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        SchedulingCenterService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppointmentService, useValue: appointments },
      ],
    }).compile();

    service = mod.get(SchedulingCenterService);
  });

  it("retorna agendamentos das unidades autorizadas do operador", async () => {
    (prisma.userUnit.findMany as jest.Mock).mockResolvedValue([
      { unitId: UNIT_A },
      { unitId: UNIT_B },
    ]);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      appt(UNIT_A),
      appt(UNIT_B),
    ]);

    const result = await service.getConsolidated(TENANT, USER, {});

    expect(result).toHaveLength(2);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          unitId: { in: [UNIT_A, UNIT_B] },
        }),
      }),
    );
  });

  it("retorna vazio quando operador não tem unidades autorizadas", async () => {
    (prisma.userUnit.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getConsolidated(TENANT, USER, {});

    expect(result).toHaveLength(0);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("filtra por unitId somente se o operador tem acesso a ela (anti-IDOR)", async () => {
    (prisma.userUnit.findMany as jest.Mock).mockResolvedValue([
      { unitId: UNIT_A },
    ]);
    // UNIT_B não está nas autorizadas; query pede UNIT_B → retorna vazio sem 403
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getConsolidated(TENANT, USER, {
      unitId: UNIT_B,
    });

    expect(result).toHaveLength(0);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("book cria agendamento em unidade autorizada via AppointmentService", async () => {
    (prisma.userUnit.findFirst as jest.Mock).mockResolvedValue({ id: "uu-1" });
    (appointments.create as jest.Mock).mockResolvedValue(appt(UNIT_A));

    const dto = {
      unitId: UNIT_A,
      professionalId: "prof-1",
      patientId: "pat-1",
      startsAt: "2026-07-01T14:00:00Z",
      endsAt: "2026-07-01T14:30:00Z",
    };

    const result = await service.book(TENANT, USER, dto as never);

    expect(appointments.create).toHaveBeenCalledWith(TENANT, dto);
    expect(result.unitId).toBe(UNIT_A);
  });

  it("book lança ForbiddenException para unidade não autorizada (anti-IDOR)", async () => {
    (prisma.userUnit.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.book(TENANT, USER, {
        unitId: UNIT_B,
        professionalId: "prof-1",
        patientId: "pat-1",
        startsAt: "2026-07-01T14:00:00Z",
        endsAt: "2026-07-01T14:30:00Z",
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(appointments.create).not.toHaveBeenCalled();
  });
});
