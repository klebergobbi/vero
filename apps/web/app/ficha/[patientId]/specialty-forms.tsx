"use client";

import { useEffect, useState, useTransition } from "react";
import {
  SPECIALTY_FORMS,
  type SpecialtyDefinition,
  type SpecialtyField,
} from "@vero/types";
import type { SpecialtyVersionMeta } from "@vero/api-client";
import { getSpecialtyAction, saveSpecialtyAction } from "./actions";

const FIRST = SPECIALTY_FORMS[0] as SpecialtyDefinition;

export function SpecialtyForms({ patientId }: { patientId: string }) {
  const [specialty, setSpecialty] = useState<string>(FIRST.key);
  const [values, setValues] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [history, setHistory] = useState<SpecialtyVersionMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  const def = SPECIALTY_FORMS.find((s) => s.key === specialty) ?? FIRST;

  // Carrega a versão corrente sempre que troca de especialidade.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSaved(false);
    getSpecialtyAction(patientId, specialty).then((res) => {
      if (!active) return;
      if (res.error) {
        setError(res.error);
        setValues({});
        setVersion(0);
        setHistory([]);
      } else if (res.data) {
        const v: Record<string, string> = {};
        for (const [k, val] of Object.entries(res.data.values)) {
          v[k] = val == null ? "" : String(val);
        }
        setValues(v);
        setVersion(res.data.version);
        setHistory(res.data.history);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [patientId, specialty]);

  const save = () => {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveSpecialtyAction(patientId, specialty, values);
      if (res.error) setError(res.error);
      else {
        setSaved(true);
        // recarrega versão/histórico
        const fresh = await getSpecialtyAction(patientId, specialty);
        if (fresh.data) {
          setVersion(fresh.data.version);
          setHistory(fresh.data.history);
        }
      }
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {SPECIALTY_FORMS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSpecialty(s.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              specialty === s.key
                ? "border-vero-600 bg-vero-50 text-vero-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{def.label}</h2>
          <span className="text-xs text-slate-400">
            {version > 0 ? `Versão atual: v${version}` : "Sem registro ainda"}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : (
          <div className="space-y-4">
            {def.fields.map((f) => (
              <Field
                key={f.id}
                field={f}
                value={values[f.id] ?? ""}
                onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))}
              />
            ))}
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mt-3 text-sm text-emerald-600">
            Ficha salva (v{version}).
          </p>
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={pending || loading}
          className="mt-5 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar nova versão"}
        </button>

        {history.length > 0 ? (
          <p className="mt-4 text-xs text-slate-400">
            Histórico: {history.map((h) => `v${h.version}`).join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: SpecialtyField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vero-600 focus:outline-none";
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {field.label}
      </span>
      {field.type === "textarea" ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </label>
  );
}
