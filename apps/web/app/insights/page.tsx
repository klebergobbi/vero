import Link from "next/link";
import type { InsightsResult } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const EMPTY: InsightsResult = {
  generatedAt: "",
  cached: false,
  disclosure: "",
  aiAvailable: false,
  metrics: {
    period: { from: "", to: "" },
    conversion: { percent: 0, approved: 0, rejected: 0 },
    occupancy: { percent: 0, bookedMinutes: 0, capacityMinutes: 0 },
    delinquency: { percent: 0, overdueCount: 0, dueCount: 0, overdueCents: 0 },
    channels: [],
  },
  insights: [],
};

const TYPE_LABEL: Record<string, string> = {
  conversao: "Conversão",
  inadimplencia: "Inadimplência",
  ocupacao: "Ocupação",
  crm: "Marketing",
};

export default async function InsightsPage() {
  const api = await serverApi();
  let data: InsightsResult = EMPTY;
  let loadError = false;
  try {
    data = await api.getInsights();
  } catch {
    loadError = true;
  }

  const { metrics } = data;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-vero-700">
          Insights {data.cached ? "(cache)" : ""}
        </h1>
        <RefreshButton />
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Sugestões acionáveis a partir dos dados agregados do seu tenant.
      </p>

      {loadError ? (
        <p className="mb-6 text-sm text-red-600">
          Não foi possível carregar os insights agora.
        </p>
      ) : null}

      {data.disclosure ? (
        <div className="mb-6 rounded-lg border border-vero-200 bg-vero-50 px-4 py-3 text-sm text-vero-800">
          🤖 {data.disclosure}
        </div>
      ) : null}

      {!data.aiAvailable ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          IA não configurada (falta <code>ANTHROPIC_API_KEY</code> no backend) —
          mostrando só as métricas agregadas, sem sugestões geradas.
        </p>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label="Conversão"
          value={`${metrics.conversion.percent}%`}
          hint={`${metrics.conversion.approved} aprov. / ${metrics.conversion.rejected} recus.`}
          tone="vero"
        />
        <Kpi
          label="Ocupação"
          value={`${metrics.occupancy.percent}%`}
          hint={`${metrics.occupancy.bookedMinutes} de ${metrics.occupancy.capacityMinutes} min`}
          tone="emerald"
        />
        <Kpi
          label="Inadimplência"
          value={`${metrics.delinquency.percent}%`}
          hint={`${metrics.delinquency.overdueCount} de ${metrics.delinquency.dueCount} parcelas — ${brl(metrics.delinquency.overdueCents)}`}
          tone="amber"
        />
      </section>

      {metrics.channels.length > 0 ? (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">
            ROI por canal de marketing
          </h2>
          <div className="space-y-2">
            {metrics.channels.map((c) => (
              <div
                key={c.sourceId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-700">
                  {c.name} · {c.leads} leads · {c.closed} fechados
                </span>
                <span
                  className={
                    c.roiCents >= 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-red-600"
                  }
                >
                  ROI {brl(c.roiCents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Sugestões geradas por IA ({data.insights.length})
        </h2>
        {data.insights.map((insight, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <span className="mb-1 inline-block rounded-full bg-vero-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-vero-700">
              {TYPE_LABEL[insight.type] ?? insight.type}
            </span>
            <p className="text-sm font-semibold text-slate-800">
              {insight.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">{insight.explanation}</p>
            <p className="mt-2 text-sm font-medium text-vero-700">
              → {insight.suggestion}
            </p>
          </div>
        ))}
        {data.aiAvailable && data.insights.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma sugestão gerada ainda.
          </p>
        ) : null}
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "vero" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    vero: "border-vero-200 bg-vero-50 text-vero-800",
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
