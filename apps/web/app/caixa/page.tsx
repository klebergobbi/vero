import Link from "next/link";
import type { CashFlowEntry, CashSummary } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { CashFlowList } from "./cashflow-list";
import { monthRange } from "./period";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  // Mês corrente (servidor) como período inicial.
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const range = monthRange(month);

  const api = await serverApi();
  let entries: CashFlowEntry[] = [];
  let summary: CashSummary = { inCents: 0, outCents: 0, balanceCents: 0 };
  try {
    [entries, summary] = await Promise.all([
      api.listCashFlow(range),
      api.cashFlowSummary(range),
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
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Fluxo de caixa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Entradas e saídas por período. Importe os pagamentos recebidos e
        concilie os movimentos.
      </p>
      <CashFlowList
        initialMonth={month}
        initialEntries={entries}
        initialSummary={summary}
      />
    </main>
  );
}
