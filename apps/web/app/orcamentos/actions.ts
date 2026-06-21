"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@vero/api-client";
import { serverApi } from "../../lib/api";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

function safeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "Orçamento já decidido — não pode mudar.";
    if (err.status === 400) return "Dados inválidos.";
    if (err.status === 403) return "Você não tem permissão.";
  }
  return fallback;
}

export async function createBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const patientId = String(formData.get("patientId") ?? "").trim();
  const planId = String(formData.get("planId") ?? "").trim();
  if (!patientId) return { error: "Escolha o paciente." };

  let id: string;
  try {
    const api = await serverApi();
    const input: { patientId: string; planId?: string } = { patientId };
    if (planId) input.planId = planId;
    const budget = await api.createBudget(input);
    id = budget.id;
  } catch (err) {
    return { error: safeError(err, "Não foi possível criar o orçamento.") };
  }
  redirect(`/orcamentos/${id}`);
}

export async function addItemAction(
  budgetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const procedureId = String(formData.get("procedureId") ?? "").trim();
  const qtyRaw = String(formData.get("quantity") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!procedureId) return { error: "Escolha o procedimento." };

  const input: {
    procedureId: string;
    quantity?: number;
    unitPriceCents?: number;
  } = { procedureId };
  if (qtyRaw) {
    const q = Number(qtyRaw);
    if (Number.isFinite(q) && q > 0) input.quantity = Math.floor(q);
  }
  if (priceRaw) {
    const reais = Number(priceRaw.replace(",", "."));
    if (Number.isFinite(reais) && reais >= 0) {
      input.unitPriceCents = Math.round(reais * 100);
    }
  }
  try {
    const api = await serverApi();
    await api.addBudgetItem(budgetId, input);
  } catch (err) {
    return { error: safeError(err, "Não foi possível adicionar o item.") };
  }
  revalidatePath(`/orcamentos/${budgetId}`);
  return { ok: true };
}

export async function removeItemAction(
  budgetId: string,
  itemId: string,
): Promise<void> {
  try {
    const api = await serverApi();
    await api.removeBudgetItem(budgetId, itemId);
  } catch {
    // fail-soft: a tela recarrega com o estado atual
  }
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function setStatusAction(
  budgetId: string,
  status: "APPROVED" | "REJECTED",
): Promise<void> {
  try {
    const api = await serverApi();
    await api.setBudgetStatus(budgetId, status);
  } catch {
    // fail-soft
  }
  revalidatePath(`/orcamentos/${budgetId}`);
}
