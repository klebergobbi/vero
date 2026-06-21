"use client";

import { useState, useTransition } from "react";
import type {
  OpenSlot,
  ProfessionalSummary,
  UnitSummary,
} from "@vero/api-client";
import { bookAction, getSlotsAction } from "./actions";

function slotLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingForm({
  slug,
  units,
  professionals,
}: {
  slug: string;
  units: UnitSummary[];
  professionals: ProfessionalSummary[];
}) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState(
    professionals[0]?.id ?? "",
  );
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<OpenSlot[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const loadSlots = () => {
    setMsg(null);
    setSelected(null);
    setSlots(null);
    start(async () => {
      const res = await getSlotsAction(slug, unitId, professionalId, date);
      if (res.error) setMsg({ text: res.error });
      else setSlots(res.slots ?? []);
    });
  };

  const submit = () => {
    if (!selected || !name || !phone) {
      setMsg({ text: "Escolha um horário e informe nome e telefone." });
      return;
    }
    start(async () => {
      const res = await bookAction(slug, {
        unitId,
        professionalId,
        startsAt: selected,
        name,
        phone,
      });
      if (res.error) {
        setMsg({ text: res.error });
      } else {
        setMsg({ ok: true, text: "Agendamento confirmado! Até breve." });
        setSlots(null);
        setSelected(null);
      }
    });
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20";

  if (msg?.ok) {
    return (
      <div className="rounded-xl border border-vero-200 bg-vero-50 p-6 text-center">
        <p className="font-medium text-vero-700">{msg.text}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Unidade
        </span>
        <select
          className={inputClass}
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Profissional
        </span>
        <select
          className={inputClass}
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
        >
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Data
        </span>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <button
        type="button"
        onClick={loadSlots}
        disabled={pending || !date}
        className="rounded-lg border border-vero-500 px-4 py-2 text-sm font-medium text-vero-700 transition hover:bg-vero-50 disabled:opacity-60"
      >
        {pending ? "Buscando…" : "Ver horários"}
      </button>

      {slots !== null ? (
        slots.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Horários disponíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => setSelected(s.start)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    selected === s.start
                      ? "border-vero-600 bg-vero-600 text-white"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {slotLabel(s.start)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400">
            Nenhum horário livre nessa data. Tente outro dia.
          </p>
        )
      ) : null}

      {selected ? (
        <div className="grid gap-4 border-t border-slate-100 pt-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Seu nome
            </span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Telefone (com DDD)
            </span>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11999998888"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
          >
            {pending ? "Confirmando…" : `Confirmar ${slotLabel(selected)}`}
          </button>
        </div>
      ) : null}

      {msg && !msg.ok ? (
        <p role="alert" className="text-sm text-red-600">
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
