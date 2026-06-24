"use client";

import { useState, useTransition } from "react";
import type { GoalProgress, ProfessionalSummary } from "@vero/api-client";
import { createGoalAction, deleteGoalAction } from "./actions";

const METRIC_LABELS: Record<string, string> = {
  REVENUE: "Faturamento",
  APPOINTMENTS: "Consultas",
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Formata o valor da meta/realizado conforme a métrica. */
function fmtValue(metric: string, value: number): string {
  return metric === "REVENUE" ? brl(value) : String(value);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function GoalsView({
  initialGoals,
  professionals,
}: {
  initialGoals: GoalProgress[];
  professionals: ProfessionalSummary[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState("");
  const [metric, setMetric] = useState("REVENUE");
  const [target, setTarget] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      // REVENUE: alvo em R$ → centavos; APPOINTMENTS: contagem inteira.
      const raw = parseFloat(target.replace(",", ".")) || 0;
      const targetValue =
        metric === "REVENUE" ? Math.round(raw * 100) : Math.round(raw);
      const res = await createGoalAction({
        ...(scope ? { professionalId: scope } : {}),
        metric,
        targetValue,
        periodStart: from ? `${from}T00:00:00.000Z` : "",
        periodEnd: to ? `${to}T23:59:59.000Z` : "",
      });
      if (res.error) setError(res.error);
      else {
        setError(null);
        if (res.goals) setGoals(res.goals);
        setTarget("");
        setFrom("");
        setTo("");
      }
    });

  const remove = (id: string) =>
    start(async () => {
      const res = await deleteGoalAction(id);
      if (res.error) setError(res.error);
      else if (res.goals) setGoals(res.goals);
    });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Nova meta</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Clínica (geral)</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="REVENUE">Faturamento (R$)</option>
            <option value="APPOINTMENTS">Consultas (nº)</option>
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder={metric === "REVENUE" ? "Alvo (R$)" : "Alvo (nº)"}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Criar meta
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Metas ({goals.length})
        </h2>
        {goals.map((g) => {
          const width = Math.min(100, Math.max(0, g.percent));
          const reached = g.percent >= 100;
          return (
            <div
              key={g.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">
                    {METRIC_LABELS[g.metric] ?? g.metric}{" "}
                    <span className="text-xs text-slate-400">
                      · {g.professional ? g.professional.name : "Clínica"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtDate(g.periodStart)} – {fmtDate(g.periodEnd)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(g.id)}
                  disabled={pending}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Remover
                </button>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${reached ? "bg-emerald-500" : "bg-vero-500"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {fmtValue(g.metric, g.realized)} de{" "}
                {fmtValue(g.metric, g.targetValue)}{" "}
                <span
                  className={`font-semibold ${
                    reached ? "text-emerald-600" : "text-vero-700"
                  }`}
                >
                  ({g.percent}%)
                </span>
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
