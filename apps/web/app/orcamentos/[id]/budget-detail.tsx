"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { BudgetDetail, ProcedureItem } from "@vero/api-client";
import {
  type ActionState,
  addItemAction,
  removeItemAction,
  setStatusAction,
} from "../actions";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20";

function AddItemButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
    >
      {pending ? "Adicionando…" : "Adicionar item"}
    </button>
  );
}

export function BudgetDetailView({
  budget,
  procedures,
}: {
  budget: BudgetDetail;
  procedures: ProcedureItem[];
}) {
  const open = budget.status === "OPEN";
  const addItem = addItemAction.bind(null, budget.id);
  const [state, action] = useActionState<ActionState, FormData>(addItem, {});
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vero-700">
            {budget.patient.name}
          </h1>
          <p className="text-sm text-slate-500">
            Status: {STATUS_LABELS[budget.status] ?? budget.status}
          </p>
        </div>
        <span className="text-2xl font-bold text-vero-700">
          {brl(budget.totalCents)}
        </span>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">
          Itens ({budget.items.length})
        </h2>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {budget.items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">Sem itens.</li>
          ) : (
            budget.items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-800">
                  {it.quantity}× {it.description}
                  <span className="text-slate-400">
                    {" "}
                    · {brl(it.unitPriceCents)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium text-slate-700">
                    {brl(it.quantity * it.unitPriceCents)}
                  </span>
                  {open ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        start(() => {
                          void removeItemAction(budget.id, it.id);
                        })
                      }
                      className="text-red-500 transition hover:text-red-700 disabled:opacity-50"
                      aria-label="Remover item"
                    >
                      ✕
                    </button>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {open ? (
        <>
          <form
            action={action}
            className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4"
          >
            <select
              name="procedureId"
              required
              defaultValue=""
              className={`${inputClass} sm:col-span-2`}
            >
              <option value="" disabled>
                Procedimento…
              </option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
              placeholder="Qtd"
              className={inputClass}
            />
            <input
              name="price"
              inputMode="decimal"
              placeholder="Preço R$ (opcional)"
              className={inputClass}
            />
            {state.error ? (
              <p role="alert" className="text-sm text-red-600 sm:col-span-4">
                {state.error}
              </p>
            ) : null}
            <div className="sm:col-span-4">
              <AddItemButton />
            </div>
          </form>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(() => {
                  void setStatusAction(budget.id, "APPROVED");
                })
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Aprovar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(() => {
                  void setStatusAction(budget.id, "REJECTED");
                })
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Recusar
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Orçamento {STATUS_LABELS[budget.status]?.toLowerCase()} — não pode
          mais ser alterado.
        </p>
      )}
    </div>
  );
}
