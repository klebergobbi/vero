import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const ACCOUNT_SELECT = {
  id: true,
  type: true,
  description: true,
  category: true,
  amountCents: true,
  dueDate: true,
  status: true,
  paidAt: true,
  notes: true,
  createdAt: true,
} satisfies Prisma.AccountSelect;

type AccountRow = Prisma.AccountGetPayload<{ select: typeof ACCOUNT_SELECT }>;

/**
 * Contas a pagar/receber (§6/S37): lançamentos financeiros da clínica com
 * vencimento, categoria e status. Baixa MANUAL (markPaid → PAID + paidAt). O flag
 * de ATRASO (OPEN + vencido) é calculado na leitura. Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lança uma conta a pagar/receber. */
  async create(
    tenantId: string,
    input: {
      type: string;
      description: string;
      category: string;
      amountCents: number;
      dueDate: string;
      notes?: string;
    },
  ) {
    const account = await this.prisma.account.create({
      data: {
        tenantId,
        type: input.type as Prisma.AccountCreateInput["type"],
        description: input.description,
        category: input.category,
        amountCents: input.amountCents,
        dueDate: new Date(input.dueDate),
        ...(input.notes ? { notes: input.notes } : {}),
      },
      select: ACCOUNT_SELECT,
    });
    return this.withOverdue(account);
  }

  async list(tenantId: string, filter: { type?: string; status?: string }) {
    const scope = new TenantScope(tenantId);
    const accounts = await this.prisma.account.findMany({
      where: scope.where<Prisma.AccountWhereInput>({
        ...(filter.type
          ? {
              type: filter.type as NonNullable<
                Prisma.AccountWhereInput["type"]
              >,
            }
          : {}),
        ...(filter.status
          ? {
              status: filter.status as NonNullable<
                Prisma.AccountWhereInput["status"]
              >,
            }
          : {}),
      }),
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      select: ACCOUNT_SELECT,
    });
    return accounts.map((a) => this.withOverdue(a));
  }

  /** Totais em aberto por tipo (pagar/receber) — visão de caixa. */
  async summary(tenantId: string) {
    const grouped = await this.prisma.account.groupBy({
      by: ["type"],
      where: { tenantId, status: "OPEN" },
      _sum: { amountCents: true },
    });
    const find = (type: string) =>
      grouped.find((g) => g.type === type)?._sum.amountCents ?? 0;
    return {
      payableOpenCents: find("PAYABLE"),
      receivableOpenCents: find("RECEIVABLE"),
    };
  }

  /** Baixa manual: marca a conta como paga. */
  async markPaid(tenantId: string, id: string) {
    const account = await this.assertAccount(tenantId, id);
    if (account.status !== "OPEN") {
      throw new ConflictException("Conta não está em aberto.");
    }
    const updated = await this.prisma.account.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
      select: ACCOUNT_SELECT,
    });
    return this.withOverdue(updated);
  }

  async cancel(tenantId: string, id: string) {
    await this.assertAccount(tenantId, id);
    const updated = await this.prisma.account.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: ACCOUNT_SELECT,
    });
    return this.withOverdue(updated);
  }

  // --- internos ---

  /** Anexa o flag de ATRASO (OPEN + vencido). */
  private withOverdue(account: AccountRow) {
    const isOverdue =
      account.status === "OPEN" && account.dueDate.getTime() < Date.now();
    return { ...account, isOverdue };
  }

  private async assertAccount(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const account = await this.prisma.account.findFirst({
      where: scope.where<Prisma.AccountWhereInput>({ id }),
      select: { id: true, status: true },
    });
    return scope.ensureOwned(account); // 403 anti-IDOR
  }
}
