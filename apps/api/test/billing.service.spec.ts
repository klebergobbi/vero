import { BadRequestException, ConflictException } from "@nestjs/common";
import { BillingService } from "../src/billing/billing.service";
import type { AsaasService } from "../src/integrations/asaas/asaas.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function asaasMock(configured: boolean) {
  return {
    configured,
    createPayment: jest
      .fn()
      .mockResolvedValue({ id: "pay_1", pixPayload: "PIXCODE" }),
  } as unknown as AsaasService;
}

describe("BillingService.createCharge (S19)", () => {
  it("recusa orçamento não aprovado → 400", async () => {
    const prisma = {
      budget: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "b1", status: "OPEN", totalCents: 100 }),
      },
    } as unknown as PrismaService;
    const service = new BillingService(prisma, asaasMock(true));
    await expect(
      service.createCharge("t1", {
        budgetId: "b1",
        method: "PIX",
        installments: 2,
        firstDueDate: "2026-07-10",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("recusa se o orçamento já tem cobrança → 409", async () => {
    const prisma = {
      budget: {
        findFirst: jest.fn().mockResolvedValue({
          id: "b1",
          status: "APPROVED",
          totalCents: 100,
          patient: { name: "X" },
          charge: { id: "c0" },
        }),
      },
    } as unknown as PrismaService;
    const service = new BillingService(prisma, asaasMock(true));
    await expect(
      service.createCharge("t1", {
        budgetId: "b1",
        method: "PIX",
        installments: 2,
        firstDueDate: "2026-07-10",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("gera cobrança no Asaas por parcela com valores do SERVIDOR", async () => {
    const installmentCreate = jest.fn().mockResolvedValue({});
    const tx = {
      charge: { create: jest.fn().mockResolvedValue({ id: "c1" }) },
      installment: { create: installmentCreate },
    };
    const prisma = {
      budget: {
        findFirst: jest.fn().mockResolvedValue({
          id: "b1",
          status: "APPROVED",
          totalCents: 10001,
          patientId: "p1",
          patient: { name: "João" },
          charge: null,
        }),
      },
      charge: {
        findFirst: jest.fn().mockResolvedValue({ id: "c1", installments: [] }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    } as unknown as PrismaService;
    const asaas = asaasMock(true);
    const service = new BillingService(prisma, asaas);

    await service.createCharge("t1", {
      budgetId: "b1",
      method: "PIX",
      installments: 3,
      firstDueDate: "2026-07-10",
    });

    // 10001 / 3 → 3334, 3334, 3333 (soma exata) — calculado no servidor.
    expect(asaas.createPayment).toHaveBeenCalledTimes(3);
    const valores = (asaas.createPayment as jest.Mock).mock.calls.map(
      (c) => c[0].valueCents,
    );
    expect(valores).toEqual([3334, 3334, 3333]);
    expect(installmentCreate).toHaveBeenCalledTimes(3);
  });
});
