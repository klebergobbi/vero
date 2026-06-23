"use client";

import { useState, useTransition } from "react";
import type { TreatmentItemDetail } from "@vero/api-client";
import { executeItemAction } from "./actions";

const ITEM_LABELS: Record<string, string> = {
  PENDING: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
};

export function PlanItems({
  planId: _planId,
  initialItems,
}: {
  planId: string;
  initialItems: TreatmentItemDetail[];
}) {
  const [items, setItems] = useState<TreatmentItemDetail[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const execute = (itemId: string) => {
    setError(null);
    setPendingId(itemId);
    start(async () => {
      const res = await executeItemAction(itemId, notes[itemId] ?? "");
      if (res.error) setError(res.error);
      else if (res.plan) {
        setItems(res.plan.items);
        setNotes((n) => ({ ...n, [itemId]: "" }));
      }
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {items.map((item) => {
        const done = item.status === "DONE";
        return (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-800">{item.description}</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  done
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {ITEM_LABELS[item.status] ?? item.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Sessões: {item.doneCount}/{item.quantity}
            </p>

            {item.executions.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                {item.executions.map((e) => (
                  <li key={e.id}>
                    {new Date(e.performedAt).toLocaleDateString("pt-BR")}
                    {e.notes ? ` — ${e.notes}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}

            {!done ? (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Observação (opcional)"
                  value={notes[item.id] ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [item.id]: e.target.value }))
                  }
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-vero-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => execute(item.id)}
                  disabled={pendingId === item.id}
                  className="rounded-lg bg-vero-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
                >
                  {pendingId === item.id ? "Registrando…" : "Registrar sessão"}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
