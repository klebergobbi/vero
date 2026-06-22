import Link from "next/link";
import { notFound } from "next/navigation";
import type { OdontogramData } from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { OdontogramChart } from "./odontogram-chart";

export const dynamic = "force-dynamic";

export default async function OdontogramaPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const api = await serverApi();

  let data: OdontogramData;
  try {
    data = await api.getOdontogram(patientId);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Odontograma</h1>
      <p className="mb-6 text-sm text-slate-500">
        Selecione uma condição e clique no dente/face. O número do dente aplica
        ao dente inteiro.
      </p>
      <OdontogramChart patientId={patientId} initial={data.conditions} />
    </main>
  );
}
