"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  CrmDemographics,
  CrmLeadItem,
  CrmReferral,
  CrmSourceReport,
  LeadChannelItem,
  PatientSummary,
} from "@vero/api-client";
import {
  createLeadAction,
  createSourceAction,
  updateStatusAction,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  SCHEDULED: "Agendado",
  CLOSED: "Fechado",
  LOST: "Perdido",
};
const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  NEW: [
    { value: "SCHEDULED", label: "Agendar" },
    { value: "LOST", label: "Perder" },
  ],
  SCHEDULED: [
    { value: "CLOSED", label: "Fechar" },
    { value: "LOST", label: "Perder" },
  ],
  CLOSED: [],
  LOST: [],
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function CrmView({
  sources,
  leads,
  report,
  referrals,
  demographics,
  patients,
}: {
  sources: LeadChannelItem[];
  leads: CrmLeadItem[];
  report: CrmSourceReport[];
  referrals: CrmReferral[];
  demographics: CrmDemographics;
  patients: PatientSummary[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // canal
  const [srcName, setSrcName] = useState("");
  const [srcCost, setSrcCost] = useState("");
  // lead
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [srcId, setSrcId] = useState("");
  const [refBy, setRefBy] = useState("");
  const [city, setCity] = useState("");
  const [birth, setBirth] = useState("");

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <div className="space-y-10">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Canais + ROI */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">
          Canais de origem · ROI
        </h2>
        <form
          className="mb-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await createSourceAction({
                name: srcName,
                costReais: srcCost,
              });
              if (!r.error) {
                setSrcName("");
                setSrcCost("");
              }
              return r;
            });
          }}
        >
          <label className="text-sm">
            <span className="block text-slate-500">Canal</span>
            <input
              className="rounded border px-2 py-1"
              value={srcName}
              onChange={(e) => setSrcName(e.target.value)}
              placeholder="Instagram"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">Investimento (R$)</span>
            <input
              className="w-28 rounded border px-2 py-1"
              type="number"
              step="0.01"
              value={srcCost}
              onChange={(e) => setSrcCost(e.target.value)}
              placeholder="0,00"
            />
          </label>
          <button
            className="rounded bg-vero-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={pending}
          >
            Adicionar canal
          </button>
        </form>
        {report.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum canal cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-1">Canal</th>
                <th>Leads</th>
                <th>Fechados</th>
                <th>Receita</th>
                <th>Investido</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.sourceId} className="border-b">
                  <td className="py-1 font-medium">{r.name}</td>
                  <td>{r.leads}</td>
                  <td>{r.closed}</td>
                  <td>{brl(r.revenueCents)}</td>
                  <td>{brl(r.costCents)}</td>
                  <td
                    className={
                      r.roiCents >= 0 ? "text-green-700" : "text-red-700"
                    }
                  >
                    {brl(r.roiCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Funil de leads */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">
          Funil de leads
        </h2>
        <form
          className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await createLeadAction({
                name,
                phone,
                leadSourceId: srcId,
                referredByPatientId: refBy,
                city,
                birthDate: birth,
              });
              if (!r.error) {
                setName("");
                setPhone("");
                setCity("");
                setBirth("");
              }
              return r;
            });
          }}
        >
          <input
            className="rounded border px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone"
          />
          <select
            className="rounded border px-2 py-1 text-sm"
            value={srcId}
            onChange={(e) => setSrcId(e.target.value)}
          >
            <option value="">Canal (opcional)</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={refBy}
            onChange={(e) => setRefBy(e.target.value)}
          >
            <option value="">Indicado por (opcional)</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="rounded border px-2 py-1 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade"
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
          <button
            className="col-span-2 rounded bg-vero-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 sm:col-span-3"
            disabled={pending}
          >
            Adicionar lead
          </button>
        </form>
        {leads.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum lead ainda.</p>
        ) : (
          <ul className="divide-y">
            {leads.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium">{l.name}</span>{" "}
                  <span className="text-slate-400">{l.phone}</span>
                  {l.leadSource && (
                    <span className="ml-2 text-slate-500">
                      · {l.leadSource.name}
                    </span>
                  )}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {STATUS_LABELS[l.status] ?? l.status}
                  {l.status === "CLOSED" && l.valueCents > 0
                    ? ` · ${brl(l.valueCents)}`
                    : ""}
                </span>
                {(NEXT_STATUS[l.status] ?? []).map((n) => (
                  <button
                    key={n.value}
                    className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50"
                    disabled={pending}
                    onClick={() =>
                      run(() => {
                        let valueReais = "";
                        if (n.value === "CLOSED") {
                          valueReais =
                            window.prompt("Valor fechado (R$):", "") ?? "";
                          if (!valueReais) return Promise.resolve({});
                        }
                        return updateStatusAction({
                          id: l.id,
                          status: n.value,
                          valueReais,
                        });
                      })
                    }
                  >
                    {n.label}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Indicações + demografia */}
      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">
            Quem indicou quem
          </h2>
          {referrals.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma indicação.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {referrals.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.referrerName}</span> indicou{" "}
                  <span className="font-medium">{r.leadName}</span>{" "}
                  <span className="text-slate-400">
                    ({STATUS_LABELS[r.leadStatus] ?? r.leadStatus})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">
            Demografia
          </h2>
          <div className="text-sm">
            <p className="mb-1 font-medium text-slate-600">Faixa etária</p>
            <ul className="mb-3 space-y-0.5">
              {demographics.byAge.map((a) => (
                <li key={a.range} className="flex justify-between">
                  <span>{a.range}</span>
                  <span className="text-slate-500">{a.count}</span>
                </li>
              ))}
            </ul>
            <p className="mb-1 font-medium text-slate-600">Cidade</p>
            <ul className="space-y-0.5">
              {demographics.byCity.map((c) => (
                <li key={c.city} className="flex justify-between">
                  <span>{c.city}</span>
                  <span className="text-slate-500">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
