import type {
  Appointment,
  PatientSummary,
  ProfessionalSummary,
  UnitSummary,
  WaitListEntry,
} from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { getActiveUnitId } from "../../lib/session";
import { logoutAction } from "../login/actions";
import { AppointmentForm } from "./appointment-form";
import { UnitSwitcher } from "./unit-switcher";

// Protegida pelo middleware (refresh transparente). Sempre dinâmica (dados por sessão).
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Check-in",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Faltou",
};

function formatRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time(start)}–${time(end)}`;
}

export default async function AgendaPage() {
  const api = await serverApi();

  // Falha de dependência não derruba a tela (§4 fail-closed no dado, não na UI).
  let appointments: Appointment[] = [];
  let patients: PatientSummary[] = [];
  let units: UnitSummary[] = [];
  let professionals: ProfessionalSummary[] = [];
  let waitList: WaitListEntry[] = [];
  let myUnits: UnitSummary[] = [];
  let loadError = false;
  try {
    [appointments, patients, units, professionals, waitList, myUnits] =
      await Promise.all([
        api.listAppointments(),
        api.listPatients(),
        api.listUnits(),
        api.listProfessionals(),
        api.listWaitList(),
        api.listMyUnits(),
      ]);
  } catch {
    loadError = true;
  }
  const activeUnitId = await getActiveUnitId();

  const patientName = new Map(patients.map((p) => [p.id, p.name]));

  const arrivedTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vero-700">Agenda</h1>
          <p className="text-sm text-slate-500">
            Próximos agendamentos da sua clínica.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <UnitSwitcher units={myUnits} activeUnitId={activeUnitId} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {loadError ? (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar a agenda agora. Tente recarregar a página.
        </div>
      ) : null}

      {waitList.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Na recepção ({waitList.length})
          </h2>
          <ul className="divide-y divide-emerald-100 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
            {waitList.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <span className="font-medium text-slate-800">
                  {patientName.get(w.patientId) ?? "Paciente"}
                </span>
                <span className="text-sm text-emerald-700">
                  chegou às {arrivedTime(w.arrivedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Novo agendamento
        </h2>
        <AppointmentForm
          patients={patients}
          units={units}
          professionals={professionals}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Agendamentos ({appointments.length})
        </h2>
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            Nenhum agendamento ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {patientName.get(a.patientId) ?? "Paciente"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatRange(a.startsAt, a.endsAt)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-vero-700">
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
