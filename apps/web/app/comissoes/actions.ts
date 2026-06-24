"use server";

import type { CommissionReport, CommissionRuleItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";

interface Result {
  rules?: CommissionRuleItem[];
  report?: CommissionReport;
  error?: string;
}

export async function createRuleAction(input: {
  professionalId: string;
  procedureId?: string;
  percent: number;
}): Promise<Result> {
  if (!input.professionalId || input.percent < 0 || input.percent > 100) {
    return { error: "Selecione o profissional e um percentual válido." };
  }
  try {
    const api = await serverApi();
    await api.createCommissionRule(input);
    return { rules: await api.listCommissionRules() };
  } catch {
    return { error: "Não foi possível criar a regra." };
  }
}

export async function recordCommissionAction(input: {
  professionalId: string;
  procedureId?: string;
  baseCents: number;
  description: string;
}): Promise<Result> {
  if (
    !input.professionalId ||
    input.baseCents <= 0 ||
    !input.description.trim()
  ) {
    return { error: "Preencha profissional, valor-base e descrição." };
  }
  try {
    const api = await serverApi();
    await api.recordCommission(input);
    return { report: await api.commissionReport() };
  } catch {
    return {
      error: "Sem regra de comissão para o profissional/procedimento.",
    };
  }
}

export async function reportAction(filter: {
  professionalId?: string;
  from?: string;
  to?: string;
}): Promise<Result> {
  try {
    const api = await serverApi();
    return { report: await api.commissionReport(filter) };
  } catch {
    return { error: "Não foi possível carregar o relatório." };
  }
}

export async function payCommissionAction(
  id: string,
  filter: { professionalId?: string; from?: string; to?: string },
): Promise<Result> {
  try {
    const api = await serverApi();
    await api.payCommission(id);
    return { report: await api.commissionReport(filter) };
  } catch {
    return { error: "Não foi possível repassar a comissão." };
  }
}
