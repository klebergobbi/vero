"use server";

import type { Account, AccountSummary } from "@vero/api-client";
import { serverApi } from "../../lib/api";

interface Result {
  accounts?: Account[];
  summary?: AccountSummary;
  error?: string;
}

async function refresh(): Promise<Result> {
  const api = await serverApi();
  const [accounts, summary] = await Promise.all([
    api.listAccounts(),
    api.accountsSummary(),
  ]);
  return { accounts, summary };
}

export async function createAccountAction(input: {
  type: string;
  description: string;
  category: string;
  amountCents: number;
  dueDate: string;
}): Promise<Result> {
  if (
    !input.description.trim() ||
    !input.category.trim() ||
    input.amountCents <= 0 ||
    !input.dueDate
  ) {
    return { error: "Preencha descrição, categoria, valor e vencimento." };
  }
  try {
    const api = await serverApi();
    await api.createAccount(input);
    return refresh();
  } catch {
    return { error: "Não foi possível lançar a conta." };
  }
}

export async function payAccountAction(id: string): Promise<Result> {
  try {
    const api = await serverApi();
    await api.payAccount(id);
    return refresh();
  } catch {
    return { error: "Não foi possível dar baixa." };
  }
}

export async function cancelAccountAction(id: string): Promise<Result> {
  try {
    const api = await serverApi();
    await api.cancelAccount(id);
    return refresh();
  } catch {
    return { error: "Não foi possível cancelar." };
  }
}
