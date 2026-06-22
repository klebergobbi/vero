import Link from "next/link";
import { SpecialtyForms } from "./specialty-forms";

export const dynamic = "force-dynamic";

export default async function FichaPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">
        Fichas por especialidade
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Escolha a especialidade e preencha a ficha. Cada salvamento gera uma
        nova versão (o histórico é preservado).
      </p>
      <SpecialtyForms patientId={patientId} />
    </main>
  );
}
