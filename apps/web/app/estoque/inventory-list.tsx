"use client";

import { useState, useTransition } from "react";
import type { InventoryAlerts, InventoryItem } from "@vero/api-client";
import { createItemAction, entradaAction, saidaAction } from "./actions";

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

export function InventoryList({
  initialItems,
  initialAlerts,
}: {
  initialItems: InventoryItem[];
  initialAlerts: InventoryAlerts;
}) {
  const [items, setItems] = useState(initialItems);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [minQty, setMinQty] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [exp, setExp] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const apply = (res: {
    items?: InventoryItem[];
    alerts?: InventoryAlerts;
    error?: string;
  }) => {
    if (res.error) setError(res.error);
    else {
      setError(null);
      if (res.items) setItems(res.items);
      if (res.alerts) setAlerts(res.alerts);
    }
  };

  const run = (fn: () => Promise<Parameters<typeof apply>[0]>) =>
    start(async () => apply(await fn()));

  const num = (id: string) => parseInt(qty[id] ?? "", 10) || 0;

  return (
    <div className="space-y-6">
      {(alerts.lowStock.length > 0 || alerts.expiring.length > 0) && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">Alertas</h2>
          {alerts.lowStock.map((i) => (
            <p key={i.id} className="text-sm text-amber-800">
              Estoque baixo: <strong>{i.name}</strong> — {i.quantity} {i.unit}{" "}
              (mín. {i.minQuantity})
            </p>
          ))}
          {alerts.expiring.map((b) => (
            <p key={b.id} className="text-sm text-amber-800">
              Validade próxima: <strong>{b.item.name}</strong>
              {b.code ? ` (${b.code})` : ""} — {b.quantity} {b.item.unit}, vence{" "}
              {fmt(b.expiresAt)}
            </p>
          ))}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Novo insumo</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Unidade (cx, un)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Mín."
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            run(async () => {
              const res = await createItemAction({
                name,
                unit,
                minQuantity: parseInt(minQty, 10) || 0,
              });
              if (!res.error) {
                setName("");
                setUnit("");
                setMinQty("");
              }
              return res;
            })
          }
          disabled={pending}
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Adicionar
        </button>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Insumos ({items.length})
        </h2>
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border bg-white p-4 ${
              item.isLow ? "border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{item.name}</p>
              <p className="text-sm">
                <span
                  className={`font-bold ${
                    item.isLow ? "text-amber-700" : "text-slate-800"
                  }`}
                >
                  {item.quantity} {item.unit}
                </span>
                <span className="ml-2 text-xs text-slate-400">
                  mín. {item.minQuantity}
                </span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                placeholder="Qtd"
                value={qty[item.id] ?? ""}
                onChange={(e) =>
                  setQty((s) => ({ ...s, [item.id]: e.target.value }))
                }
                className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
              <input
                type="date"
                title="Validade (entrada)"
                value={exp[item.id] ?? ""}
                onChange={(e) =>
                  setExp((s) => ({ ...s, [item.id]: e.target.value }))
                }
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  run(() =>
                    entradaAction(item.id, num(item.id), exp[item.id] ?? ""),
                  )
                }
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => run(() => saidaAction(item.id, num(item.id)))}
                disabled={pending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                Saída
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
