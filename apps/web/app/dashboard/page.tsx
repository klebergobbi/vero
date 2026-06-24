import Link from "next/link";
import type { DashboardData } from "@vero/api-client";
import { serverApi } from "../../lib/api";

export const dynamic = "force-dynamic";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const EMPTY: DashboardData = {
  period: { from: "", to: "" },
  kpis: {
    revenueCents: 0,
    billedCents: 0,
    appointmentsCount: 0,
    conversionPercent: 0,
    approvedBudgets: 0,
    rejectedBudgets: 0,
  },
  series: [],
  generatedAt: "",
  cached: false,
};

export default async function DashboardPage() {
  // Período: ano corrente (agrega os KPIs do ano; a série pega os últimos 6 meses).
  const now = new Date();
  const year = now.getUTCFullYear();
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

  const api = await serverApi();
  let data: DashboardData = EMPTY;
  try {
    data = await api.getDashboard({ from, to });
  } catch {
    // fail-soft
  }

  const k = data.kpis;
  const maxRevenue = Math.max(1, ...data.series.map((s) => s.revenueCents));
  const maxAppts = Math.max(1, ...data.series.map((s) => s.appointments));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">
        Indicadores do ano {year} {data.cached ? "(do cache)" : ""}.
      </p>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Receita" value={brl(k.revenueCents)} tone="emerald" />
        <Kpi label="Faturamento" value={brl(k.billedCents)} tone="vero" />
        <Kpi
          label="Consultas"
          value={String(k.appointmentsCount)}
          tone="slate"
        />
        <Kpi
          label="Conversão"
          value={`${k.conversionPercent}%`}
          tone="amber"
          hint={`${k.approvedBudgets} aprov. / ${k.rejectedBudgets} recus.`}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-slate-700">
          Receita e consultas por mês
        </h2>
        <div className="flex items-end gap-3" style={{ height: 180 }}>
          {data.series.map((s) => (
            <div
              key={s.month}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] text-emerald-700">
                {s.revenueCents > 0 ? brl(s.revenueCents) : ""}
              </span>
              <div className="flex w-full items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-emerald-500"
                  style={{ height: (s.revenueCents / maxRevenue) * 120 }}
                  title={`Receita ${brl(s.revenueCents)}`}
                />
                <div
                  className="w-3 rounded-t bg-vero-500"
                  style={{ height: (s.appointments / maxAppts) * 120 }}
                  title={`${s.appointments} consultas`}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {s.month.slice(5)}/{s.month.slice(2, 4)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded bg-emerald-500" />
            Receita
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded bg-vero-500" />
            Consultas
          </span>
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "emerald" | "vero" | "slate" | "amber";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    vero: "border-vero-200 bg-vero-50 text-vero-800",
    slate: "border-slate-200 bg-white text-slate-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint ? <p className="text-[10px] opacity-70">{hint}</p> : null}
    </div>
  );
}
