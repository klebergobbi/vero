"use server";

import type { CashFlowEntry, CashSummary } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { monthRange } from "./period";

interface MonthData {
  entries?: CashFlowEntry[];
  summary?: CashSummary;
  error?: string;
}

export async function loadMonthAction(month: string): Promise<MonthData> {
  try {
    const api = await serverApi();
    const range = monthRange(month);
    const [entries, summary] = await Promise.all([
      api.listCashFlow(range),
      api.cashFlowSummary(range),
    ]);
    return { entries, summary };
  } catch {
    return { error: "Não foi possível carregar o caixa." };
  }
}

export async function recordCashFlowAction(
  month: string,
  input: {
    direction: string;
    amountCents: number;
    date: string;
    category: string;
    description: string;
  },
): Promise<MonthData> {
  if (
    input.amountCents <= 0 ||
    !input.date ||
    !input.category.trim() ||
    !input.description.trim()
  ) {
    return { error: "Preencha valor, data, categoria e descrição." };
  }
  try {
    const api = await serverApi();
    await api.recordCashFlow(input);
    return loadMonthAction(month);
  } catch {
    return { error: "Não foi possível lançar o movimento." };
  }
}

export async function syncPaymentsAction(
  month: string,
): Promise<MonthData & { imported?: number }> {
  try {
    const api = await serverApi();
    const { imported } = await api.syncCashFlowPayments();
    return { ...(await loadMonthAction(month)), imported };
  } catch {
    return { error: "Não foi possível importar pagamentos." };
  }
}

export async function reconcileAction(
  month: string,
  id: string,
): Promise<MonthData> {
  try {
    const api = await serverApi();
    await api.reconcileCashFlow(id);
    return loadMonthAction(month);
  } catch {
    return { error: "Não foi possível conciliar." };
  }
}
