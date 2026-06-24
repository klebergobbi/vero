import Link from "next/link";
import type { GoalProgress, ProfessionalSummary } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { GoalsView } from "./goals-view";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const api = await serverApi();

  let goals: GoalProgress[] = [];
  let professionals: ProfessionalSummary[] = [];
  try {
    [goals, professionals] = await Promise.all([
      api.listGoals(),
      api.listProfessionals(),
    ]);
  } catch {
    // fail-soft
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Metas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Defina metas por clínica ou profissional e acompanhe o progresso
        (realizado vs meta).
      </p>
      <GoalsView initialGoals={goals} professionals={professionals} />
    </main>
  );
}
