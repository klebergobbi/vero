"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CentralAppointment, CentralUnitOption, PatientSummary, UnitSummary } from "@vero/api-client";
import { bookCentralAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Check-in",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CHECKED_IN: "bg-teal-100 text-teal-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

interface Props {
  appointments: CentralAppointment[];
  units: CentralUnitOption[];
  professionals: UnitSummary[];
  patients: PatientSummary[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SchedulingCenter({ appointments, units, professionals, patients }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    async (_: unknown, fd: FormData) => {
      const result = await bookCentralAction(fd);
      if (result.success) {
        startTransition(() => router.refresh());
        return { success: true };
      }
      return result;
    },
    null,
  );

  return (
    <div className="space-y-8">
      {/* ── Form de novo agendamento ── */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Novo agendamento</h2>
        <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Unidade *</label>
            <select name="unitId" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Profissional *</label>
            <select name="professionalId" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Paciente *</label>
            <select name="patientId" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Início *</label>
            <input type="datetime-local" name="startsAt" required className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fim *</label>
            <input type="datetime-local" name="endsAt" required className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <input type="text" name="notes" placeholder="Opcional" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 text-white px-5 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? "Agendando…" : "Agendar"}
            </button>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="text-sm text-green-600">Agendamento criado.</p>}
          </div>
        </form>
      </section>

      {/* ── Visão consolidada ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Agenda consolidada
          <span className="ml-2 text-base font-normal text-gray-500">({appointments.length})</span>
        </h2>
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum agendamento no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Unidade</th>
                  <th className="px-4 py-3 text-left">Início</th>
                  <th className="px-4 py-3 text-left">Fim</th>
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">Profissional</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.unit.name}</td>
                    <td className="px-4 py-3 tabular-nums">{fmt(a.startsAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmt(a.endsAt)}</td>
                    <td className="px-4 py-3">
                      <div>{a.patient.name}</div>
                      <div className="text-gray-400 text-xs">{a.patient.phone}</div>
                    </td>
                    <td className="px-4 py-3">{a.professional.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
