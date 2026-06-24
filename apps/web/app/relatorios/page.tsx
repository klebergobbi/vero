import Link from "next/link";
import type { ReportItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { ReportsView } from "./reports-view";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const api = await serverApi();
  let reports: ReportItem[] = [];
  try {
    reports = await api.listReports();
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
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Relatórios</h1>
      <p className="mb-6 text-sm text-slate-500">
        Gere relatórios de faturamento e de faltas/desmarcações por período. A
        geração roda em segundo plano; baixe quando ficar pronto.
      </p>
      <ReportsView initialReports={reports} />
    </main>
  );
}
