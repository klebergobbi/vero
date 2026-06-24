import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const FLOW_SELECT = {
  id: true,
  direction: true,
  amountCents: true,
  date: true,
  category: true,
  description: true,
  source: true,
  paymentId: true,
  accountId: true,
  createdAt: true,
  reconciliation: { select: { method: true, reconciledAt: true } },
} satisfies Prisma.CashFlowSelect;

type FlowRow = Prisma.CashFlowGetPayload<{ select: typeof FLOW_SELECT }>;

/**
 * Fluxo de caixa + conciliação (§6/S38): ledger unificado de entradas/saídas com
 * visão diária/mensal (filtro de período) e conciliação bancária — AUTO (importa os
 * pagamentos da S20, idempotente por `paymentId @unique`) ou MANUAL. Tenant-scoped
 * (anti-IDOR).
 */
@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Lança um movimento de caixa manual. */
  async record(
    tenantId: string,
    input: {
      direction: string;
      amountCents: number;
      date: string;
      category: string;
      description: string;
    },
  ) {
    const flow = await this.prisma.cashFlow.create({
      data: {
        tenantId,
        direction: input.direction as Prisma.CashFlowCreateInput["direction"],
        amountCents: input.amountCents,
        date: new Date(input.date),
        category: input.category,
        description: input.description,
        source: "MANUAL",
      },
      select: FLOW_SELECT,
    });
    return this.toFlow(flow);
  }

  /** Conciliação AUTO: importa os pagamentos da S20 ainda não no caixa. */
  async syncPayments(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        cashFlow: { is: null },
      },
      select: { id: true, amountCents: true, paidAt: true },
    });

    let imported = 0;
    for (const p of payments) {
      try {
        await this.prisma.cashFlow.create({
          data: {
            tenantId,
            direction: "IN",
            amountCents: p.amountCents,
            date: p.paidAt,
            category: "Recebimento",
            description: "Pagamento conciliado (Asaas)",
            source: "PAYMENT",
            paymentId: p.id,
            reconciliation: {
              create: { tenantId, method: "AUTO" },
            },
          },
        });
        imported++;
      } catch (err) {
        // Idempotência: corrida no unique paymentId → ignora.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          continue;
        }
        throw err;
      }
    }
    this.logger.log(`Caixa: ${imported} pagamentos importados (auto).`);
    return { imported };
  }

  /** Conciliação MANUAL: marca um movimento como casado. */
  async reconcile(tenantId: string, id: string, input: { reference?: string }) {
    const scope = new TenantScope(tenantId);
    const flow = await this.prisma.cashFlow.findFirst({
      where: scope.where<Prisma.CashFlowWhereInput>({ id }),
      select: { id: true, reconciliation: { select: { id: true } } },
    });
    const owned = scope.ensureOwned(flow); // 403 anti-IDOR
    if (owned.reconciliation) {
      throw new ConflictException("Movimento já conciliado.");
    }
    await this.prisma.bankReconciliation.create({
      data: {
        tenantId,
        cashFlowId: id,
        method: "MANUAL",
        ...(input.reference ? { reference: input.reference } : {}),
      },
    });
    return this.getOne(tenantId, id);
  }

  async list(tenantId: string, range: { from?: string; to?: string }) {
    const scope = new TenantScope(tenantId);
    const flows = await this.prisma.cashFlow.findMany({
      where: scope.where<Prisma.CashFlowWhereInput>(this.dateWhere(range)),
      orderBy: { date: "desc" },
      select: FLOW_SELECT,
    });
    return flows.map((f) => this.toFlow(f));
  }

  /** Visão de caixa do período: total entradas/saídas + saldo. */
  async summary(tenantId: string, range: { from?: string; to?: string }) {
    const grouped = await this.prisma.cashFlow.groupBy({
      by: ["direction"],
      where: { tenantId, ...this.dateWhere(range) },
      _sum: { amountCents: true },
    });
    const sum = (dir: string) =>
      grouped.find((g) => g.direction === dir)?._sum.amountCents ?? 0;
    const inCents = sum("IN");
    const outCents = sum("OUT");
    return { inCents, outCents, balanceCents: inCents - outCents };
  }

  // --- internos ---

  private async getOne(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const flow = await this.prisma.cashFlow.findFirst({
      where: scope.where<Prisma.CashFlowWhereInput>({ id }),
      select: FLOW_SELECT,
    });
    return this.toFlow(scope.ensureOwned(flow));
  }

  private dateWhere(range: {
    from?: string;
    to?: string;
  }): Prisma.CashFlowWhereInput {
    if (!range.from && !range.to) return {};
    return {
      date: {
        ...(range.from ? { gte: new Date(range.from) } : {}),
        ...(range.to ? { lte: new Date(range.to) } : {}),
      },
    };
  }

  private toFlow(flow: FlowRow) {
    const { reconciliation, ...rest } = flow;
    return {
      ...rest,
      reconciled: reconciliation != null,
      reconcileMethod: reconciliation?.method ?? null,
    };
  }
}
