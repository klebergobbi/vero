"use server";

import { type ProstheticOrder } from "@vero/api-client";
import { serverApi } from "../../lib/api";

async function relist(): Promise<ProstheticOrder[]> {
  const api = await serverApi();
  return api.listProstheticOrders();
}

export async function createProstheticAction(input: {
  patientId: string;
  labName: string;
  description: string;
  expectedReturnDate?: string;
}): Promise<{ orders?: ProstheticOrder[]; error?: string }> {
  if (!input.patientId || !input.labName.trim() || !input.description.trim()) {
    return { error: "Preencha paciente, laboratório e descrição." };
  }
  try {
    const api = await serverApi();
    await api.createProstheticOrder({
      patientId: input.patientId,
      labName: input.labName,
      description: input.description,
      ...(input.expectedReturnDate
        ? { expectedReturnDate: input.expectedReturnDate }
        : {}),
    });
    return { orders: await relist() };
  } catch {
    return { error: "Não foi possível registrar o pedido." };
  }
}

export async function sendProstheticAction(
  id: string,
  expectedReturnDate: string,
): Promise<{ orders?: ProstheticOrder[]; error?: string }> {
  try {
    const api = await serverApi();
    await api.sendProstheticOrder(id, expectedReturnDate || undefined);
    return { orders: await relist() };
  } catch {
    return { error: "Não foi possível marcar como enviado." };
  }
}

export async function receiveProstheticAction(
  id: string,
): Promise<{ orders?: ProstheticOrder[]; error?: string }> {
  try {
    const api = await serverApi();
    await api.receiveProstheticOrder(id);
    return { orders: await relist() };
  } catch {
    return { error: "Não foi possível marcar como recebido." };
  }
}

export async function cancelProstheticAction(
  id: string,
): Promise<{ orders?: ProstheticOrder[]; error?: string }> {
  try {
    const api = await serverApi();
    await api.cancelProstheticOrder(id);
    return { orders: await relist() };
  } catch {
    return { error: "Não foi possível cancelar." };
  }
}
