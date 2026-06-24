import Link from "next/link";
import type {
  CommissionReport,
  CommissionRuleItem,
  ProcedureItem,
  ProfessionalSummary,
} from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { CommissionsView } from "./commissions-view";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const api = await serverApi();

  let rules: CommissionRuleItem[] = [];
  let report: CommissionReport = { entries: [], totals: [] };
  let professionals: ProfessionalSummary[] = [];
  let procedures: ProcedureItem[] = [];
  try {
    [rules, report, professionals, procedures] = await Promise.all([
      api.listCommissionRules(),
      api.commissionReport(),
      api.listProfessionals(),
      api.listProcedures(),
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
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Comissões</h1>
      <p className="mb-6 text-sm text-slate-500">
        Defina regras por profissional/procedimento, registre comissões e veja o
        relatório por profissional e período.
      </p>
      <CommissionsView
        initialRules={rules}
        initialReport={report}
        professionals={professionals}
        procedures={procedures}
      />
    </main>
  );
}
