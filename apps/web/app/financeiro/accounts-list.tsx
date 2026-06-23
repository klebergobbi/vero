"use client";

import { useState, useTransition } from "react";
import type { Account, AccountSummary } from "@vero/api-client";
import {
  cancelAccountAction,
  createAccountAction,
  payAccountAction,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Em aberto",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function AccountsList({
  initialAccounts,
  initialSummary,
}: {
  initialAccounts: Account[];
  initialSummary: AccountSummary;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("PAYABLE");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, start] = useTransition();

  const apply = (res: {
    accounts?: Account[];
    summary?: AccountSummary;
    error?: string;
  }) => {
    if (res.error) setError(res.error);
    else {
      setError(null);
      if (res.accounts) setAccounts(res.accounts);
      if (res.summary) setSummary(res.summary);
    }
  };

  const create = () =>
    start(async () => {
      const res = await createAccountAction({
        type,
        description,
        category,
        amountCents: Math.round(
          (parseFloat(amount.replace(",", ".")) || 0) * 100,
        ),
        dueDate,
      });
      apply(res);
      if (!res.error) {
        setDescription("");
        setCategory("");
        setAmount("");
        setDueDate("");
      }
    });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">A pagar (aberto)</p>
          <p className="text-xl font-bold text-red-800">
            {brl(summary.payableOpenCents)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">
            A receber (aberto)
          </p>
          <p className="text-xl font-bold text-emerald-800">
            {brl(summary.receivableOpenCents)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Novo lançamento
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PAYABLE">A pagar</option>
            <option value="RECEIVABLE">A receber</option>
          </select>
          <input
            type="text"
            placeholder="Categoria (ex.: Fixo, Material)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Valor (R$)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={create}
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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Lançamentos ({accounts.length})
        </h2>
        {accounts.map((a) => {
          const open = a.status === "OPEN";
          return (
            <div
              key={a.id}
              className={`rounded-xl border bg-white p-4 ${
                a.isOverdue ? "border-red-300" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">
                    {a.description}{" "}
                    <span className="text-xs text-slate-400">
                      · {a.category}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.type === "PAYABLE" ? "A pagar" : "A receber"} · vence{" "}
                    {fmt(a.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      a.type === "PAYABLE" ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {brl(a.amountCents)}
                  </p>
                  <span className="text-xs text-slate-400">
                    {a.isOverdue ? "Atrasado · " : ""}
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>
              </div>
              {open ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      start(async () => apply(await payAccountAction(a.id)))
                    }
                    disabled={pending}
                    className="rounded-lg bg-vero-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
                  >
                    Dar baixa
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      start(async () => apply(await cancelAccountAction(a.id)))
                    }
                    disabled={pending}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
