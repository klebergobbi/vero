"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type {
  PatientSummary,
  ProfessionalSummary,
  UnitSummary,
} from "@vero/api-client";
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
 * DTO do backend (§4). Unidade, profissional e paciente vêm de seletores
 * carregados da API (tenant-scoped); sem precisar saber IDs.
 */
export function AppointmentForm({
  patients,
  units,
  professionals,
}: {
  patients: PatientSummary[];
  units: UnitSummary[];
  professionals: ProfessionalSummary[];
}) {
  const [state, formAction] = useActionState(
    createAppointmentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"
    >
      <SelectField
        label="Unidade"
        name="unitId"
        placeholder="Selecione uma unidade…"
        empty="Nenhuma unidade cadastrada."
        options={units.map((u) => ({ value: u.id, label: u.name }))}
      />
      <SelectField
        label="Profissional"
        name="professionalId"
        placeholder="Selecione um profissional…"
        empty="Nenhum profissional cadastrado."
        options={professionals.map((p) => ({ value: p.id, label: p.name }))}
      />

      <SelectField
        className="sm:col-span-2"
        label="Paciente"
        name="patientId"
        placeholder="Selecione um paciente…"
        empty="Nenhum paciente cadastrado ainda."
        options={patients.map((p) => ({
          value: p.id,
          label: `${p.name} — ${p.phone}`,
        }))}
      />

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

function SelectField(props: {
  label: string;
  name: string;
  placeholder: string;
  empty: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={`block ${props.className ?? ""}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {props.label}
      </span>
      {props.options.length > 0 ? (
        <select
          name={props.name}
          required
          defaultValue=""
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20"
        >
          <option value="" disabled>
            {props.placeholder}
          </option>
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400">
          {props.empty}
        </p>
      )}
    </label>
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
