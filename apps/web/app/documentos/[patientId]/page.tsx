import Link from "next/link";
import type { ClinicalDocumentSummary } from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { DocumentsPanel } from "./documents-panel";

export const dynamic = "force-dynamic";

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const api = await serverApi();

  let docs: ClinicalDocumentSummary[] = [];
  try {
    docs = await api.listDocuments(patientId);
  } catch {
    docs = [];
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">
        Atestados e receituários
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Emita o documento, assine digitalmente e baixe o PDF. A assinatura
        registra o profissional e um hash de integridade.
      </p>
      <DocumentsPanel patientId={patientId} initialDocs={docs} />
    </main>
  );
}
