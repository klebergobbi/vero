import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AsaasService } from "../integrations/asaas/asaas.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CalculateRoyaltyDto, ChargeRoyaltyDto } from "./dto/royalty.dto";

const ROYALTY_SELECT = {
  id: true,
  tenantId: true,
  unitId: true,
  unit: { select: { name: true } },
  periodStart: true,
  periodEnd: true,
  baseCents: true,
  percent: true,
  amountCents: true,
  status: true,
  asaasPaymentId: true,
  pixPayload: true,
  boletoBarcode: true,
  paidAt: true,
  createdAt: true,
} as const;

/**
 * Royalties por unidade de franquia (§6/S47).
 * Calcula o faturamento do período, cria a royalty PENDING (1 por unidade×período),
 * cobra via Asaas e reconcilia manualmente.
 */
@Injectable()
export class RoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  /**
   * Calcula o faturamento da unidade no período e cria a royalty PENDING.
   * Idempotente: mesmo (unitId × período) → ConflictException.
   * Anti-IDOR: valida que a unidade pertence ao tenant.
   */
  async calculate(tenantId: string, dto: CalculateRoyaltyDto) {
    const { unitId, percent, periodStart, periodEnd } = dto;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (start >= end) {
      throw new ConflictException("periodStart deve ser anterior a periodEnd");
    }

    // Anti-IDOR: valida que a unidade pertence ao tenant.
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!unit) throw new ForbiddenException("Unidade não encontrada no tenant");

    // Faturamento bruto = cobranças não-canceladas da unidade no período.
    const charges = await this.prisma.charge.findMany({
      where: {
        tenantId,
        status: { not: "CANCELLED" },
        budget: { unitId },
        createdAt: { gte: start, lt: end },
      },
      select: { totalCents: true },
    });
    const baseCents = charges.reduce((s, c) => s + c.totalCents, 0);
    const amountCents = Math.round((baseCents * percent) / 100);

    try {
      return await this.prisma.royalty.create({
        data: {
          tenantId,
          unitId,
          periodStart: start,
          periodEnd: end,
          baseCents,
          percent,
          amountCents,
        },
        select: ROYALTY_SELECT,
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "P2002") {
        throw new ConflictException(
          "Royalty já calculada para esta unidade e período",
        );
      }
      throw err;
    }
  }

  /** Lista royalties do tenant, opcionalmente filtradas por unidade. */
  async list(tenantId: string, unitId?: string) {
    return this.prisma.royalty.findMany({
      where: { tenantId, ...(unitId ? { unitId } : {}) },
      select: ROYALTY_SELECT,
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Gera cobrança no Asaas para a royalty PENDING → CHARGED.
   * Segredos Asaas ficam no backend; valores não vêm do cliente.
   */
  async charge(tenantId: string, royaltyId: string, dto: ChargeRoyaltyDto) {
    const royalty = await this.ensureOwned(tenantId, royaltyId);

    if (royalty.status !== "PENDING") {
      throw new ConflictException(
        `Royalty com status ${royalty.status} não pode ser cobrada`,
      );
    }

    const result = this.asaas.configured
      ? await this.asaas.createPayment({
          valueCents: royalty.amountCents,
          dueDate: dto.dueDate,
          method: dto.method,
          description: `Royalty ${royalty.unit.name} ${royalty.periodStart.toISOString().slice(0, 7)}`,
          externalReference: royalty.id,
        })
      : {
          id: `stub-${royalty.id}`,
          pixPayload: undefined,
          boletoBarcode: undefined,
        };

    return this.prisma.royalty.update({
      where: { id: royaltyId },
      data: {
        status: "CHARGED",
        asaasPaymentId: result.id,
        pixPayload: result.pixPayload ?? null,
        boletoBarcode: result.boletoBarcode ?? null,
      },
      select: ROYALTY_SELECT,
    });
  }

  /** Concilia manualmente o recebimento da royalty → PAID. */
  async markPaid(tenantId: string, royaltyId: string) {
    const royalty = await this.ensureOwned(tenantId, royaltyId);

    if (royalty.status === "PAID" || royalty.status === "CANCELLED") {
      throw new ConflictException(
        `Royalty com status ${royalty.status} não pode ser marcada como paga`,
      );
    }

    return this.prisma.royalty.update({
      where: { id: royaltyId },
      data: { status: "PAID", paidAt: new Date() },
      select: ROYALTY_SELECT,
    });
  }

  /** Cancela uma royalty PENDING ou CHARGED. */
  async cancel(tenantId: string, royaltyId: string) {
    const royalty = await this.ensureOwned(tenantId, royaltyId);

    if (royalty.status === "PAID" || royalty.status === "CANCELLED") {
      throw new ConflictException(
        `Royalty com status ${royalty.status} não pode ser cancelada`,
      );
    }

    return this.prisma.royalty.update({
      where: { id: royaltyId },
      data: { status: "CANCELLED" },
      select: ROYALTY_SELECT,
    });
  }

  private async ensureOwned(tenantId: string, royaltyId: string) {
    const r = await this.prisma.royalty.findFirst({
      where: { id: royaltyId, tenantId },
      select: { ...ROYALTY_SELECT, unit: { select: { name: true } } },
    });
    if (!r) throw new NotFoundException("Royalty não encontrada");
    return r;
  }
}
