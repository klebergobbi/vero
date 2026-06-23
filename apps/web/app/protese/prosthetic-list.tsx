"use client";

import { useState, useTransition } from "react";
import type { PatientSummary, ProstheticOrder } from "@vero/api-client";
import {
  cancelProstheticAction,
  createProstheticAction,
  receiveProstheticAction,
  sendProstheticAction,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Solicitado",
  SENT: "No laboratório",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-slate-100 text-slate-600",
  SENT: "bg-amber-50 text-amber-700",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-400",
};

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

export function ProstheticList({
  initialOrders,
  patients,
}: {
  initialOrders: ProstheticOrder[];
  patients: PatientSummary[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [labName, setLabName] = useState("");
  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [sendDates, setSendDates] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const run = (
    fn: () => Promise<{ orders?: ProstheticOrder[]; error?: string }>,
    onOk?: () => void,
  ) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else if (res.orders) {
        setOrders(res.orders);
        onOk?.();
      }
    });
  };

  const create = () =>
    run(
      () =>
        createProstheticAction({
          patientId,
          labName,
          description,
          ...(expected ? { expectedReturnDate: expected } : {}),
        }),
      () => {
        setLabName("");
        setDescription("");
        setExpected("");
      },
    );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Novo pedido</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Paciente…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Laboratório"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Descrição (ex.: coroa dente 11)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="text-sm text-slate-600">
            Prazo de retorno
            <input
              type="date"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={create}
              disabled={pending}
              className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
            >
              Registrar
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Pedidos ({orders.length})
        </h2>
        {orders.map((o) => (
          <div
            key={o.id}
            className={`rounded-xl border bg-white p-4 ${
              o.isLate ? "border-red-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{o.patient.name}</p>
                <p className="text-xs text-slate-500">
                  {o.labName} · {o.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {o.isLate ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Atrasado
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Prazo: {fmt(o.expectedReturnDate)}
              {o.receivedAt ? ` · Recebido em ${fmt(o.receivedAt)}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {o.status === "REQUESTED" ? (
                <>
                  <input
                    type="date"
                    value={sendDates[o.id] ?? ""}
                    onChange={(e) =>
                      setSendDates((s) => ({ ...s, [o.id]: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        sendProstheticAction(o.id, sendDates[o.id] ?? ""),
                      )
                    }
                    disabled={pending}
                    className="rounded-lg bg-vero-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
                  >
                    Enviar ao lab
                  </button>
                </>
              ) : null}
              {o.status === "SENT" ? (
                <button
                  type="button"
                  onClick={() => run(() => receiveProstheticAction(o.id))}
                  disabled={pending}
                  className="rounded-lg bg-vero-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
                >
                  Marcar recebido
                </button>
              ) : null}
              {o.status === "REQUESTED" || o.status === "SENT" ? (
                <button
                  type="button"
                  onClick={() => run(() => cancelProstheticAction(o.id))}
                  disabled={pending}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
