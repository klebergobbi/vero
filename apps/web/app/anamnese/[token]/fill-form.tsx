"use client";

import { useState, useTransition } from "react";
import type { AnamnesisQuestion } from "@vero/api-client";
import { submitAnamnesisAction } from "./actions";

export function AnamnesisFillForm({
  token,
  templateName,
  questions,
}: {
  token: string;
  templateName: string;
  questions: AnamnesisQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        Anamnese enviada e assinada. Obrigado! Você já pode fechar esta página.
      </p>
    );
  }

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await submitAnamnesisAction(token, answers);
      if (res.error) setError(res.error);
      else setDone(true);
    });
  };

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {templateName}
      </h2>
      <div className="space-y-4">
        {questions.map((q) => (
          <label key={q.id} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {q.label}
            </span>
            <input
              type="text"
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vero-600 focus:outline-none"
            />
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-6 w-full rounded-lg bg-vero-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Assinar e enviar"}
      </button>
      <p className="mt-3 text-xs text-slate-400">
        Ao enviar, você assina eletronicamente esta anamnese (registramos data,
        hora e IP como evidência).
      </p>
    </div>
  );
}
