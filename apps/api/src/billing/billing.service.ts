import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import {
  AsaasService,
  type AsaasPaymentResult,
} from "../integrations/asaas/asaas.service";
import { PrismaService } from "../prisma/prisma.service";
import { monthlyDueDates, splitCents } from "./billing.util";
import type { CreateChargeDto } from "./dto/billing.dto";

/**
 * Cobranças (§6/S19): transforma um orçamento APROVADO em parcelas e gera as
 * cobranças PIX/boleto via Asaas (proxy backend). Tenant-scoped (anti-IDOR §4).
 * VALORES SEMPRE calculados no servidor (split exato), nunca vindos do front.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  async createCharge(tenantId: string, dto: CreateChargeDto) {
    const scope = new TenantScope(tenantId);
    const budget = await this.prisma.budget.findFirst({
      where: scope.where<Prisma.BudgetWhereInput>({
        id: dto.budgetId,
        deletedAt: null,
      }),
      include: {
        patient: { select: { name: true } },
        charge: { select: { id: true } },
      },
    });
    const owned = scope.ensureOwned(budget);
    if (owned.status !== "APPROVED") {
      throw new BadRequestException(
        "O orçamento precisa estar aprovado para gerar a cobrança.",
      );
    }
    if (owned.charge) {
      throw new ConflictException("Este orçamento já tem cobrança.");
    }
    if (owned.totalCents <= 0) {
      throw new BadRequestException("Orçamento sem valor.");
    }

    const amounts = splitCents(owned.totalCents, dto.installments);
    const dueDates = monthlyDueDates(dto.firstDueDate, dto.installments);

    // Cobrança no Asaas ANTES de persistir → fail-closed limpo (nada parcial).
    const payments: (AsaasPaymentResult | null)[] = [];
    if (this.asaas.configured) {
      for (let i = 0; i < dto.installments; i++) {
        payments.push(
          await this.asaas.createPayment({
            valueCents: amounts[i] ?? 0,
            dueDate: dueDates[i] ?? dto.firstDueDate,
            method: dto.method,
            description: `Parcela ${i + 1}/${dto.installments} - ${owned.patient.name}`,
            externalReference: dto.budgetId,
          }),
        );
      }
    } else {
      this.logger.warn(
        "Asaas não configurado: parcelas geradas sem cobrança externa.",
      );
      for (let i = 0; i < dto.installments; i++) payments.push(null);
    }

    const chargeId = await this.prisma.$transaction(async (tx) => {
      const charge = await tx.charge.create({
        data: {
          tenantId,
          budgetId: dto.budgetId,
          patientId: owned.patientId,
          totalCents: owned.totalCents,
          method: dto.method,
        },
        select: { id: true },
      });
      for (let i = 0; i < dto.installments; i++) {
        const p = payments[i];
        await tx.installment.create({
          data: {
            tenantId,
            chargeId: charge.id,
            number: i + 1,
            amountCents: amounts[i] ?? 0,
            dueDate: new Date(`${dueDates[i]}T12:00:00.000Z`),
            asaasPaymentId: p?.id ?? null,
            pixPayload: p?.pixPayload ?? null,
            boletoBarcode: p?.boletoBarcode ?? null,
          },
        });
      }
      return charge.id;
    });

    return this.getCharge(tenantId, chargeId);
  }

  listCharges(tenantId: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.charge.findMany({
      where: scope.where<Prisma.ChargeWhereInput>({ deletedAt: null }),
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { name: true } },
        _count: { select: { installments: true } },
      },
    });
  }

  async getCharge(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const charge = await this.prisma.charge.findFirst({
      where: scope.where<Prisma.ChargeWhereInput>({ id, deletedAt: null }),
      include: {
        patient: { select: { name: true } },
        installments: { orderBy: { number: "asc" } },
      },
    });
    return scope.ensureOwned(charge);
  }
}
