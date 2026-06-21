"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@vero/api-client";
import { serverApi } from "../../lib/api";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

function safeError(err: unknown, fallback: string): ActionState {
  if (err instanceof ApiError) {
    if (err.status === 400) return { error: "Dados inválidos ou duplicados." };
    if (err.status === 403) return { error: "Você não tem permissão." };
  }
  return { error: fallback };
}

export async function createProcedureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const durationRaw = String(formData.get("durationMinutes") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome do procedimento." };

  const input: { name: string; code?: string; durationMinutes?: number } = {
    name,
  };
  if (code) input.code = code;
  if (durationRaw) {
    const d = Number(durationRaw);
    if (Number.isFinite(d) && d > 0) input.durationMinutes = Math.floor(d);
  }
  try {
    const api = await serverApi();
    await api.createProcedure(input);
  } catch (err) {
    return safeError(err, "Não foi possível criar o procedimento.");
  }
  revalidatePath("/catalogo");
  return { ok: true };
}

export async function createPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome do convênio." };
  try {
    const api = await serverApi();
    await api.createPlan({ name });
  } catch (err) {
    return safeError(err, "Não foi possível criar o convênio.");
  }
  revalidatePath("/catalogo");
  return { ok: true };
}

export async function createPriceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const procedureId = String(formData.get("procedureId") ?? "").trim();
  const planId = String(formData.get("planId") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!procedureId || !planId) {
    return { error: "Escolha o procedimento e o convênio." };
  }
  const reais = Number(priceRaw.replace(",", "."));
  if (!Number.isFinite(reais) || reais < 0) {
    return { error: "Preço inválido." };
  }
  const priceCents = Math.round(reais * 100);
  try {
    const api = await serverApi();
    await api.createPrice({ procedureId, planId, priceCents });
  } catch (err) {
    return safeError(err, "Não foi possível salvar o preço.");
  }
  revalidatePath("/catalogo");
  return { ok: true };
}
