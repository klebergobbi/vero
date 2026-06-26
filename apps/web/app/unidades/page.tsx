import Link from "next/link";
import type { UnitRankRow } from "@vero/api-client";
import { serverApi } from "../../lib/api";

export const dynamic = "force-dynamic";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function UnidadesPage() {
  const api = await serverApi();
  let ranking: UnitRankRow[] = [];
  let loadError = false;
  try {
    ranking = await api.unitsRanking();
  } catch {
    loadError = true;
  }

  const totalBilled = ranking.reduce((s, r) => s + r.billedCents, 0);
  const totalAppointments = ranking.reduce((s, r) => s + r.appointments, 0);
  const maxBilled = Math.max(1, ...ranking.map((r) => r.billedCents));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Unidades</h1>
      <p className="mb-6 text-sm text-slate-500">
        Comparativo de desempenho e ranking entre as unidades da rede.
      </p>

      {loadError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar o comparativo agora.
        </div>
      ) : ranking.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          Nenhuma unidade para comparar.
        </div>
      ) : (
        <>
          {/* Consolidado da rede */}
          <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase text-emerald-700">
                Faturamento da rede
              </p>
              <p className="text-xl font-bold text-emerald-800">
                {brl(totalBilled)}
              </p>
            </div>
            <div className="rounded-xl border border-vero-200 bg-vero-50 p-4">
              <p className="text-xs uppercase text-vero-700">Consultas</p>
              <p className="text-xl font-bold text-vero-800">
                {totalAppointments}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-500">Unidades</p>
              <p className="text-xl font-bold text-slate-700">
                {ranking.length}
              </p>
            </div>
          </section>

          {/* Ranking */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              Ranking por faturamento
            </h2>
            <ul className="space-y-3">
              {ranking.map((r, i) => (
                <li
                  key={r.unitId}
                  className={`rounded-xl border p-4 ${
                    i === 0
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {i + 1}
                      </span>
                      {r.name}
                    </span>
                    <span className="font-bold text-emerald-700">
                      {brl(r.billedCents)}
                    </span>
                  </div>
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${Math.round((r.billedCents / maxBilled) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                    <span>
                      Consultas: <strong>{r.appointments}</strong> (realizadas{" "}
                      {r.completed} · faltas {r.noShow})
                    </span>
                    <span>
                      Conversão: <strong>{r.conversionPercent}%</strong> (
                      {r.approvedBudgets} aprov./{r.rejectedBudgets} recus.)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
