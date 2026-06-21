import Link from "next/link";
import type { BudgetSummary, PatientSummary, PlanItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { logoutAction } from "../login/actions";
import { CreateBudgetForm } from "./create-form";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function OrcamentosPage() {
  const api = await serverApi();

  let budgets: BudgetSummary[] = [];
  let patients: PatientSummary[] = [];
  let plans: PlanItem[] = [];
  let loadError = false;
  try {
    [budgets, patients, plans] = await Promise.all([
      api.listBudgets(),
      api.listPatients(),
      api.listPlans(),
    ]);
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vero-700">Orçamentos</h1>
          <p className="text-sm text-slate-500">
            Monte e acompanhe os orçamentos da clínica.
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
          Não foi possível carregar os orçamentos agora.
        </div>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Novo orçamento
        </h2>
        <CreateBudgetForm patients={patients} plans={plans} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Orçamentos ({budgets.length})
        </h2>
        {budgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            Nenhum orçamento ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {budgets.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/orcamentos/${b.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">
                    {b.patient.name}
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-semibold text-vero-700">
                      {brl(b.totalCents)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
