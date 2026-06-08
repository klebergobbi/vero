"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { PatientSummary } from "@vero/api-client";
import {
  createAppointmentAction,
  type CreateAppointmentState,
} from "./actions";

const initialState: CreateAppointmentState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
    >
      {pending ? "Agendando…" : "Agendar"}
    </button>
  );
}

/**
 * Form de criação de agendamento. Validação aqui é só UX — a barreira real é o
 * DTO do backend (§4). Paciente vem de um seletor (API); unidade e profissional
 * são IDs por enquanto (sem endpoint de listagem ainda — fica para sessão futura).
 */
export function AppointmentForm({ patients }: { patients: PatientSummary[] }) {
  const [state, formAction] = useActionState(
    createAppointmentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"
    >
      <Field label="Unidade (ID)" name="unitId" placeholder="unit_…" />
      <Field
        label="Profissional (ID)"
        name="professionalId"
        placeholder="user_…"
      />

      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Paciente
        </span>
        {patients.length > 0 ? (
          <select
            name="patientId"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20"
          >
            <option value="" disabled>
              Selecione um paciente…
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.phone}
              </option>
            ))}
          </select>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400">
            Nenhum paciente cadastrado ainda.
          </p>
        )}
      </label>

      <Field label="Início" name="startsAt" type="datetime-local" />
      <Field label="Fim" name="endsAt" type="datetime-local" />

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-vero-700 sm:col-span-2">
          Agendamento criado.
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {props.label}
      </span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20"
      />
    </label>
  );
}
