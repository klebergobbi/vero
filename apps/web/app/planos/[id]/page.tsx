import Link from "next/link";
import { notFound } from "next/navigation";
import type { TreatmentPlanDetail } from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { PlanItems } from "./plan-items";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  ACTIVE: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default async function PlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();

  let plan: TreatmentPlanDetail;
  try {
    plan = await api.getTreatmentPlan(id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-vero-700">
          Plano de tratamento
        </h1>
        <span className="rounded-full bg-vero-50 px-3 py-1 text-xs font-medium text-vero-700">
          {PLAN_LABELS[plan.status] ?? plan.status}
        </span>
      </div>
      <PlanItems planId={plan.id} initialItems={plan.items} />
    </main>
  );
}
