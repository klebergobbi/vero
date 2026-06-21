"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { PlanItem, ProcedureItem } from "@vero/api-client";
import {
  type ActionState,
  createPlanAction,
  createPriceAction,
  createProcedureAction,
} from "./actions";

const initial: ActionState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
    >
      {pending ? "Salvando…" : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-red-600">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm text-vero-700">
        Salvo.
      </p>
    );
  return null;
}

export function ProcedureForm() {
  const [state, action] = useActionState(createProcedureAction, initial);
  return (
    <form
      action={action}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <input
        name="name"
        placeholder="Nome (ex.: Limpeza)"
        required
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="code"
          placeholder="Código (opcional)"
          className={inputClass}
        />
        <input
          name="durationMinutes"
          type="number"
          min="1"
          placeholder="Duração (min)"
          className={inputClass}
        />
      </div>
      <Feedback state={state} />
      <div>
        <SubmitButton label="Adicionar procedimento" />
      </div>
    </form>
  );
}

export function PlanForm() {
  const [state, action] = useActionState(createPlanAction, initial);
  return (
    <form
      action={action}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <input
        name="name"
        placeholder="Nome (ex.: Particular, Unimed)"
        required
        className={inputClass}
      />
      <Feedback state={state} />
      <div>
        <SubmitButton label="Adicionar convênio" />
      </div>
    </form>
  );
}

export function PriceForm({
  procedures,
  plans,
}: {
  procedures: ProcedureItem[];
  plans: PlanItem[];
}) {
  const [state, action] = useActionState(createPriceAction, initial);
  const ready = procedures.length > 0 && plans.length > 0;
  return (
    <form
      action={action}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3"
    >
      <select
        name="procedureId"
        required
        defaultValue=""
        className={inputClass}
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
      <select name="planId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Convênio…
        </option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        name="price"
        inputMode="decimal"
        placeholder="Preço (R$)"
        required
        className={inputClass}
      />
      <div className="sm:col-span-3">
        <Feedback state={state} />
      </div>
      <div className="sm:col-span-3">
        <SubmitButton label="Salvar preço" />
      </div>
      {!ready ? (
        <p className="text-sm text-slate-400 sm:col-span-3">
          Cadastre ao menos 1 procedimento e 1 convênio para definir preços.
        </p>
      ) : null}
    </form>
  );
}
