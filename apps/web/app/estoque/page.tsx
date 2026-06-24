import Link from "next/link";
import type { InventoryAlerts, InventoryItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { InventoryList } from "./inventory-list";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const api = await serverApi();

  let items: InventoryItem[] = [];
  let alerts: InventoryAlerts = { lowStock: [], expiring: [] };
  try {
    [items, alerts] = await Promise.all([
      api.listInventoryItems(),
      api.inventoryAlerts(),
    ]);
  } catch {
    // fail-soft
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Estoque</h1>
      <p className="mb-6 text-sm text-slate-500">
        Controle de insumos com lotes, validade e custo. Registre entradas e
        saídas; acompanhe os alertas.
      </p>
      <InventoryList initialItems={items} initialAlerts={alerts} />
    </main>
  );
}
