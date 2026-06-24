import Link from "next/link";
import type {
  CrmDemographics,
  CrmLeadItem,
  CrmReferral,
  CrmSourceReport,
  LeadChannelItem,
  PatientSummary,
} from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { CrmView } from "./crm-view";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const api = await serverApi();
  let sources: LeadChannelItem[] = [];
  let leads: CrmLeadItem[] = [];
  let report: CrmSourceReport[] = [];
  let referrals: CrmReferral[] = [];
  let demographics: CrmDemographics = { byAge: [], byCity: [] };
  let patients: PatientSummary[] = [];
  try {
    [sources, leads, report, referrals, demographics, patients] =
      await Promise.all([
        api.listLeadSources(),
        api.listLeads(),
        api.crmReportBySource(),
        api.crmReferrals(),
        api.crmDemographics(),
        api.listPatients(),
      ]);
  } catch {
    // fail-soft
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">CRM</h1>
      <p className="mb-6 text-sm text-slate-500">
        Rastreie o lead da origem ao fechamento, veja o ROI por canal, quem
        indicou quem e a demografia dos contatos.
      </p>
      <CrmView
        sources={sources}
        leads={leads}
        report={report}
        referrals={referrals}
        demographics={demographics}
        patients={patients}
      />
    </main>
  );
}
