import Link from "next/link";
import { notFound } from "next/navigation";
import type { BudgetDetail, ProcedureItem } from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { BudgetDetailView } from "./budget-detail";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();

  let budget: BudgetDetail;
  let procedures: ProcedureItem[] = [];
  try {
    [budget, procedures] = await Promise.all([
      api.getBudget(id),
      api.listProcedures(),
    ]);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/orcamentos"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <BudgetDetailView budget={budget} procedures={procedures} />
    </main>
  );
}
