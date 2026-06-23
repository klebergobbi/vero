"use client";

import { useState, useTransition } from "react";
import type {
  CrcTask,
  PatientSummary,
  ProfessionalSummary,
} from "@vero/api-client";
import {
  assignCrcAction,
  createCrcAction,
  doneCrcAction,
  syncCrcAction,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  RETURN: "Retorno",
  POST_SALE: "Pós-venda",
  REACTIVATION: "Reativação",
  BIRTHDAY: "Aniversário",
  OTHER: "Outro",
};

const TYPE_COLORS: Record<string, string> = {
  RETURN: "bg-vero-50 text-vero-700",
  POST_SALE: "bg-blue-50 text-blue-700",
  REACTIVATION: "bg-amber-50 text-amber-700",
  BIRTHDAY: "bg-pink-50 text-pink-700",
  OTHER: "bg-slate-100 text-slate-600",
};

export function CrcList({
  initialTasks,
  professionals,
  patients,
}: {
  initialTasks: CrcTask[];
  professionals: ProfessionalSummary[];
  patients: PatientSummary[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState("");
  const [newType, setNewType] = useState("POST_SALE");
  const [newNotes, setNewNotes] = useState("");
  const [pending, start] = useTransition();

  const run = (
    fn: () => Promise<{ tasks?: CrcTask[]; error?: string; created?: number }>,
  ) => {
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        if (res.tasks) setTasks(res.tasks);
        if (typeof res.created === "number") {
          setInfo(`${res.created} tarefa(s) de retorno importada(s).`);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => run(syncCrcAction)}
          disabled={pending}
          className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Sincronizar retornos
        </button>
        {info ? <span className="text-sm text-emerald-600">{info}</span> : null}
        {error ? (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Nova tarefa</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            value={newPatient}
            onChange={(e) => setNewPatient(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          >
            <option value="">Paciente…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="POST_SALE">Pós-venda</option>
            <option value="REACTIVATION">Reativação</option>
            <option value="BIRTHDAY">Aniversário</option>
            <option value="OTHER">Outro</option>
          </select>
          <button
            type="button"
            onClick={() =>
              run(() => createCrcAction(newPatient, newType, newNotes))
            }
            disabled={pending}
            className="rounded-lg border border-vero-500 px-3 py-2 text-sm font-medium text-vero-700 transition hover:bg-vero-50 disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
        <input
          type="text"
          placeholder="Observação (opcional)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Contatos do dia ({tasks.length})
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma tarefa aberta. Use “Sincronizar retornos” para importar.
          </p>
        ) : null}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  {task.patient.name}
                </p>
                <p className="text-xs text-slate-500">{task.patient.phone}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  TYPE_COLORS[task.type] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {TYPE_LABELS[task.type] ?? task.type}
              </span>
            </div>
            {task.notes ? (
              <p className="mt-1 text-sm text-slate-500">{task.notes}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={task.assignedToId ?? ""}
                onChange={(e) =>
                  run(() => assignCrcAction(task.id, e.target.value || null))
                }
                disabled={pending}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              >
                <option value="">Sem responsável</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => run(() => doneCrcAction(task.id))}
                disabled={pending}
                className="rounded-lg bg-vero-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
              >
                Marcar feito
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
