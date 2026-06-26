import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AsaasService } from "../src/integrations/asaas/asaas.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RoyaltyService } from "../src/network/royalty.service";

const TENANT = "tenant-1";
const UNIT = "unit-1";
const NOW = new Date("2026-06-01T00:00:00Z");
const END = new Date("2026-07-01T00:00:00Z");

const baseRoyalty = {
  id: "roy-1",
  tenantId: TENANT,
  unitId: UNIT,
  unit: { name: "Matriz" },
  periodStart: NOW,
  periodEnd: END,
  baseCents: 10000,
  percent: 10,
  amountCents: 1000,
  status: "PENDING" as const,
  asaasPaymentId: null,
  pixPayload: null,
  boletoBarcode: null,
  paidAt: null,
  createdAt: NOW,
};

describe("RoyaltyService", () => {
  let service: RoyaltyService;
  let prisma: Record<string, jest.Mock>;
  let asaas: Record<string, jest.Mock | boolean>;

  beforeEach(async () => {
    prisma = {
      unit: { findFirst: jest.fn() },
      charge: { findMany: jest.fn() },
      royalty: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    asaas = {
      configured: true,
      createPayment: jest.fn().mockResolvedValue({
        id: "asaas-123",
        pixPayload: "00020126...",
        boletoBarcode: undefined,
      }),
    };

    const mod = await Test.createTestingModule({
      providers: [
        RoyaltyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AsaasService, useValue: asaas },
      ],
    }).compile();

    service = mod.get(RoyaltyService);
  });

  it("calcula royalty do faturamento do período e cria PENDING", async () => {
    (prisma.unit.findFirst as jest.Mock).mockResolvedValue({ id: UNIT });
    (prisma.charge.findMany as jest.Mock).mockResolvedValue([
      { totalCents: 6000 },
      { totalCents: 4000 },
    ]);
    (prisma.royalty.create as jest.Mock).mockResolvedValue({
      ...baseRoyalty,
      baseCents: 10000,
      amountCents: 1000,
    });

    const result = await service.calculate(TENANT, {
      unitId: UNIT,
      percent: 10,
      periodStart: "2026-06-01",
      periodEnd: "2026-07-01",
    });

    expect(result.baseCents).toBe(10000);
    expect(result.amountCents).toBe(1000);
    expect(result.status).toBe("PENDING");
    // Valida que o split foi calculado server-side (não passou valor do cliente)
    const createCall = (prisma.royalty.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.amountCents).toBe(1000);
  });

  it("lança ForbiddenException ao calcular royalty de unidade de outro tenant", async () => {
    (prisma.unit.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.calculate("outro-tenant", {
        unitId: UNIT,
        percent: 10,
        periodStart: "2026-06-01",
        periodEnd: "2026-07-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lança ConflictException ao tentar calcular royalty duplicada (P2002)", async () => {
    (prisma.unit.findFirst as jest.Mock).mockResolvedValue({ id: UNIT });
    (prisma.charge.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.royalty.create as jest.Mock).mockRejectedValue({ code: "P2002" });

    await expect(
      service.calculate(TENANT, {
        unitId: UNIT,
        percent: 10,
        periodStart: "2026-06-01",
        periodEnd: "2026-07-01",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("cobra a royalty PENDING via Asaas e marca CHARGED", async () => {
    (prisma.royalty.findFirst as jest.Mock).mockResolvedValue(baseRoyalty);
    (prisma.royalty.update as jest.Mock).mockResolvedValue({
      ...baseRoyalty,
      status: "CHARGED",
      asaasPaymentId: "asaas-123",
      pixPayload: "00020126...",
    });

    const result = await service.charge(
      TENANT,
      "roy-1",
      { method: "PIX", dueDate: "2026-07-10" },
      "actor-1",
    );

    expect(result.status).toBe("CHARGED");
    expect(result.asaasPaymentId).toBe("asaas-123");
    expect(asaas.createPayment as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ valueCents: 1000, method: "PIX" }),
    );
  });

  it("marca royalty como PAID na conciliação manual", async () => {
    (prisma.royalty.findFirst as jest.Mock).mockResolvedValue({
      ...baseRoyalty,
      status: "CHARGED",
    });
    (prisma.royalty.update as jest.Mock).mockResolvedValue({
      ...baseRoyalty,
      status: "PAID",
      paidAt: new Date(),
    });

    const result = await service.markPaid(TENANT, "roy-1");

    expect(result.status).toBe("PAID");
    expect(result.paidAt).toBeDefined();
  });

  it("lança ConflictException ao tentar pagar royalty já PAID", async () => {
    (prisma.royalty.findFirst as jest.Mock).mockResolvedValue({
      ...baseRoyalty,
      status: "PAID",
    });

    await expect(service.markPaid(TENANT, "roy-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
