import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { CrmService } from "../src/crm/crm.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  source?: unknown;
  patient?: unknown;
  lead?: unknown;
  sources?: unknown[];
  grouped?: unknown[];
  closed?: unknown[];
}) {
  const leadCreate = jest
    .fn()
    .mockImplementation(({ data }) => ({ id: "l1", ...data }));
  const leadUpdate = jest
    .fn()
    .mockImplementation(({ data }) => ({ id: "l1", ...data }));
  const prisma = {
    leadChannel: {
      findFirst: jest.fn().mockResolvedValue(opts.source ?? null),
      findMany: jest.fn().mockResolvedValue(opts.sources ?? []),
    },
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    cRMLead: {
      create: leadCreate,
      update: leadUpdate,
      findFirst: jest.fn().mockResolvedValue(opts.lead ?? null),
      findMany: jest.fn(),
      groupBy: jest
        .fn()
        .mockResolvedValueOnce(opts.grouped ?? [])
        .mockResolvedValueOnce(opts.closed ?? []),
    },
  } as unknown as PrismaService;
  return { service: new CrmService(prisma), leadCreate, leadUpdate };
}

describe("CrmService (S44)", () => {
  it("createLead com indicação registra um Referral (quem indicou quem)", async () => {
    const { service, leadCreate } = build({ patient: { id: "p1" } });
    await service.createLead("t1", {
      name: "Lead X",
      phone: "11999990000",
      referredByPatientId: "p1",
    });
    const data = leadCreate.mock.calls[0][0].data;
    expect(data.referredByPatientId).toBe("p1");
    expect(data.referral.create.referrerPatientId).toBe("p1"); // Referral criado
  });

  it("createLead com paciente indicador inválido → 400", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.createLead("t1", {
        name: "X",
        phone: "11999990000",
        referredByPatientId: "nao-existe",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("updateStatus CLOSED sem valor → 400", async () => {
    const { service } = build({ lead: { id: "l1" } });
    await expect(
      service.updateStatus("t1", "l1", { status: "CLOSED" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("updateStatus anti-IDOR: lead de outro tenant → 403", async () => {
    const { service } = build({ lead: null });
    await expect(
      service.updateStatus("t1", "alheio", { status: "SCHEDULED" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("reportBySource calcula ROI = receita fechada − custo", async () => {
    const { service } = build({
      sources: [{ id: "s1", name: "Instagram", costCents: 30000 }],
      grouped: [{ leadSourceId: "s1", _count: { _all: 5 } }],
      closed: [
        {
          leadSourceId: "s1",
          _count: { _all: 2 },
          _sum: { valueCents: 80000 },
        },
      ],
    });
    const res = await service.reportBySource("t1");
    expect(res[0]?.leads).toBe(5);
    expect(res[0]?.closed).toBe(2);
    expect(res[0]?.revenueCents).toBe(80000);
    expect(res[0]?.roiCents).toBe(50000); // 80000 - 30000
  });
});
