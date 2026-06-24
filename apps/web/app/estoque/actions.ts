"use server";

import type { InventoryAlerts, InventoryItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";

interface Result {
  items?: InventoryItem[];
  alerts?: InventoryAlerts;
  error?: string;
}

async function refresh(): Promise<Result> {
  const api = await serverApi();
  const [items, alerts] = await Promise.all([
    api.listInventoryItems(),
    api.inventoryAlerts(),
  ]);
  return { items, alerts };
}

export async function createItemAction(input: {
  name: string;
  unit: string;
  minQuantity: number;
}): Promise<Result> {
  if (!input.name.trim() || !input.unit.trim()) {
    return { error: "Preencha nome e unidade." };
  }
  try {
    const api = await serverApi();
    await api.createInventoryItem(input);
    return refresh();
  } catch {
    return { error: "Não foi possível criar o insumo." };
  }
}

export async function entradaAction(
  itemId: string,
  quantity: number,
  expiresAt: string,
): Promise<Result> {
  if (quantity <= 0) return { error: "Quantidade inválida." };
  try {
    const api = await serverApi();
    await api.stockIn(itemId, {
      quantity,
      ...(expiresAt ? { expiresAt: `${expiresAt}T00:00:00.000Z` } : {}),
    });
    return refresh();
  } catch {
    return { error: "Não foi possível registrar a entrada." };
  }
}

export async function saidaAction(
  itemId: string,
  quantity: number,
): Promise<Result> {
  if (quantity <= 0) return { error: "Quantidade inválida." };
  try {
    const api = await serverApi();
    await api.stockOut(itemId, { quantity });
    return refresh();
  } catch {
    return { error: "Estoque insuficiente ou erro ao registrar a saída." };
  }
}
