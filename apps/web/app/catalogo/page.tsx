import type { PlanItem, PriceItem, ProcedureItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { logoutAction } from "../login/actions";
import { PlanForm, PriceForm, ProcedureForm } from "./catalog-forms";

// Protegida pelo middleware. Dados por sessão.
export const dynamic = "force-dynamic";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function CatalogoPage() {
  const api = await serverApi();

  let procedures: ProcedureItem[] = [];
  let plans: PlanItem[] = [];
  let prices: PriceItem[] = [];
  let loadError = false;
  try {
    [procedures, plans, prices] = await Promise.all([
      api.listProcedures(),
      api.listPlans(),
      api.listPrices(),
    ]);
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vero-700">Catálogo</h1>
          <p className="text-sm text-slate-500">
            Procedimentos, convênios e preços da clínica.
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sair
          </button>
        </form>
      </header>

      {loadError ? (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar o catálogo agora.
        </div>
      ) : null}

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">
            Procedimentos ({procedures.length})
          </h2>
          <ProcedureForm />
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {procedures.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">
                Nenhum procedimento.
              </li>
            ) : (
              procedures.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="text-slate-400">
                    {p.durationMinutes ? `${p.durationMinutes} min` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">
            Convênios ({plans.length})
          </h2>
          <PlanForm />
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {plans.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">
                Nenhum convênio.
              </li>
            ) : (
              plans.map((p) => (
                <li key={p.id} className="px-4 py-2.5 text-sm text-slate-800">
                  {p.name}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Preços por convênio ({prices.length})
        </h2>
        <PriceForm procedures={procedures} plans={plans} />
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {prices.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">
              Nenhum preço cadastrado.
            </li>
          ) : (
            prices.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-slate-800">
                  {pr.procedure.name}
                  <span className="text-slate-400"> · {pr.plan.name}</span>
                </span>
                <span className="font-semibold text-vero-700">
                  {brl(pr.priceCents)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
