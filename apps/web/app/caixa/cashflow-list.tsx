"use client";

import { useState, useTransition } from "react";
import type { CashFlowEntry, CashSummary } from "@vero/api-client";
import {
  loadMonthAction,
  recordCashFlowAction,
  reconcileAction,
  syncPaymentsAction,
} from "./actions";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function CashFlowList({
  initialMonth,
  initialEntries,
  initialSummary,
}: {
  initialMonth: string;
  initialEntries: CashFlowEntry[];
  initialSummary: CashSummary;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState("OUT");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();

  const apply = (res: {
    entries?: CashFlowEntry[];
    summary?: CashSummary;
    error?: string;
    imported?: number;
  }) => {
    if (res.error) setError(res.error);
    else {
      setError(null);
      if (res.entries) setEntries(res.entries);
      if (res.summary) setSummary(res.summary);
      if (typeof res.imported === "number") {
        setInfo(`${res.imported} pagamento(s) importado(s).`);
      }
    }
  };

  const changeMonth = (m: string) => {
    setMonth(m);
    setInfo(null);
    start(async () => apply(await loadMonthAction(m)));
  };

  const sync = () => {
    setInfo(null);
    start(async () => apply(await syncPaymentsAction(month)));
  };

  const record = () => {
    setInfo(null);
    start(async () => {
      const res = await recordCashFlowAction(month, {
        direction,
        amountCents: Math.round(
          (parseFloat(amount.replace(",", ".")) || 0) * 100,
        ),
        date: date ? `${date}T12:00:00.000Z` : "",
        category,
        description,
      });
      apply(res);
      if (!res.error) {
        setAmount("");
        setCategory("");
        setDescription("");
        setDate("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => changeMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="rounded-lg border border-vero-500 px-3 py-2 text-sm font-medium text-vero-700 transition hover:bg-vero-50 disabled:opacity-60"
        >
          Importar pagamentos
        </button>
        {info ? <span className="text-sm text-emerald-600">{info}</span> : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Entradas</p>
          <p className="text-lg font-bold text-emerald-800">
            {brl(summary.inCents)}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">Saídas</p>
          <p className="text-lg font-bold text-red-800">
            {brl(summary.outCents)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Saldo</p>
          <p
            className={`text-lg font-bold ${
              summary.balanceCents < 0 ? "text-red-700" : "text-slate-800"
            }`}
          >
            {brl(summary.balanceCents)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Lançar movimento
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="OUT">Saída</option>
            <option value="IN">Entrada</option>
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Valor (R$)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={record}
          disabled={pending}
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Lançar
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-700">
          Movimentos ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum movimento no período.</p>
        ) : null}
        {entries.map((e) => {
          const isIn = e.direction === "IN";
          return (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {e.description}{" "}
                  <span className="text-xs text-slate-400">· {e.category}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {fmt(e.date)}
                  {e.reconciled ? (
                    <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      conciliado · {e.reconcileMethod}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-bold ${
                    isIn ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {isIn ? "+" : "−"}
                  {brl(e.amountCents)}
                </span>
                {!e.reconciled ? (
                  <button
                    type="button"
                    onClick={() =>
                      start(async () =>
                        apply(await reconcileAction(month, e.id)),
                      )
                    }
                    disabled={pending}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Conciliar
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
