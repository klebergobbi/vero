"use client";

import { useState, useTransition } from "react";
import type {
  CommissionReport,
  CommissionRuleItem,
  ProcedureItem,
  ProfessionalSummary,
} from "@vero/api-client";
import {
  createRuleAction,
  payCommissionAction,
  recordCommissionAction,
  reportAction,
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

export function CommissionsView({
  initialRules,
  initialReport,
  professionals,
  procedures,
}: {
  initialRules: CommissionRuleItem[];
  initialReport: CommissionReport;
  professionals: ProfessionalSummary[];
  procedures: ProcedureItem[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [report, setReport] = useState(initialReport);
  const [error, setError] = useState<string | null>(null);
  // regra
  const [rProf, setRProf] = useState("");
  const [rProc, setRProc] = useState("");
  const [rPercent, setRPercent] = useState("");
  // registro
  const [cProf, setCProf] = useState("");
  const [cProc, setCProc] = useState("");
  const [cBase, setCBase] = useState("");
  const [cDesc, setCDesc] = useState("");
  // filtro
  const [fProf, setFProf] = useState("");
  const [pending, start] = useTransition();

  const procName = (id: string | null) =>
    id ? (procedures.find((p) => p.id === id)?.name ?? id) : "Geral";

  const apply = (res: {
    rules?: CommissionRuleItem[];
    report?: CommissionReport;
    error?: string;
  }) => {
    if (res.error) setError(res.error);
    else {
      setError(null);
      if (res.rules) setRules(res.rules);
      if (res.report) setReport(res.report);
    }
  };

  const filter = () => ({ ...(fProf ? { professionalId: fProf } : {}) });

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Regras ({rules.length})
        </h2>
        <div className="mb-3 space-y-1">
          {rules.map((r) => (
            <p key={r.id} className="text-sm text-slate-600">
              <strong>{r.professional.name}</strong> · {procName(r.procedureId)}{" "}
              — {r.percent}%
            </p>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={rProf}
            onChange={(e) => setRProf(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          >
            <option value="">Profissional…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={rProc}
            onChange={(e) => setRProc(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Geral</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="%"
            value={rPercent}
            onChange={(e) => setRPercent(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            start(async () => {
              const res = await createRuleAction({
                professionalId: rProf,
                ...(rProc ? { procedureId: rProc } : {}),
                percent: parseInt(rPercent, 10) || 0,
              });
              apply(res);
              if (!res.error) setRPercent("");
            })
          }
          disabled={pending}
          className="mt-3 rounded-lg border border-vero-500 px-4 py-2 text-sm font-medium text-vero-700 transition hover:bg-vero-50 disabled:opacity-60"
        >
          Adicionar regra
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Registrar comissão
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={cProf}
            onChange={(e) => setCProf(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Profissional…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={cProc}
            onChange={(e) => setCProc(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sem procedimento (geral)</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Valor-base (R$)"
            value={cBase}
            onChange={(e) => setCBase(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Descrição"
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            start(async () => {
              const res = await recordCommissionAction({
                professionalId: cProf,
                ...(cProc ? { procedureId: cProc } : {}),
                baseCents: Math.round(
                  (parseFloat(cBase.replace(",", ".")) || 0) * 100,
                ),
                description: cDesc,
              });
              apply(res);
              if (!res.error) {
                setCBase("");
                setCDesc("");
              }
            })
          }
          disabled={pending}
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Calcular e registrar
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-slate-700">Relatório</h2>
          <select
            value={fProf}
            onChange={(e) => {
              setFProf(e.target.value);
              start(async () =>
                apply(
                  await reportAction(
                    e.target.value ? { professionalId: e.target.value } : {},
                  ),
                ),
              );
            }}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {report.totals.map((t) => (
          <div
            key={t.professionalId}
            className="flex items-center justify-between rounded-xl border border-vero-200 bg-vero-50 px-4 py-3"
          >
            <span className="font-medium text-vero-800">{t.name}</span>
            <span className="font-bold text-vero-800">{brl(t.totalCents)}</span>
          </div>
        ))}

        {report.entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">
                {e.description}
              </p>
              <p className="text-xs text-slate-500">
                {e.professional.name} · {fmt(e.date)} · {e.percent}% de{" "}
                {brl(e.baseCents)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">
                {brl(e.amountCents)}
              </span>
              {e.status === "PENDING" ? (
                <button
                  type="button"
                  onClick={() =>
                    start(async () =>
                      apply(await payCommissionAction(e.id, filter())),
                    )
                  }
                  disabled={pending}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Repassar
                </button>
              ) : (
                <span className="text-xs text-emerald-600">Repassado</span>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
