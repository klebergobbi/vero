"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { PatientSummary, PlanItem } from "@vero/api-client";
import { type ActionState, createBudgetAction } from "./actions";

const initial: ActionState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar orçamento"}
    </button>
  );
}

export function CreateBudgetForm({
  patients,
  plans,
}: {
  patients: PatientSummary[];
  plans: PlanItem[];
}) {
  const [state, action] = useActionState(createBudgetAction, initial);
  return (
    <form
      action={action}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
    >
      <select name="patientId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Paciente…
        </option>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select name="planId" defaultValue="" className={inputClass}>
        <option value="">Particular (sem convênio)</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
