import { createApiClient, type AnamnesisForm } from "@vero/api-client";
import { apiBaseUrl } from "../../../lib/session";
import { AnamnesisFillForm } from "./fill-form";

// Página PÚBLICA (sem login — liberada no middleware): preenchimento/assinatura
// remota da anamnese por link de uso único (§S28). Dados por requisição.
export const dynamic = "force-dynamic";

export default async function AnamnesePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const api = createApiClient({ baseUrl: apiBaseUrl });

  let form: AnamnesisForm | null = null;
  try {
    form = await api.getAnamnesisForm(token);
  } catch {
    form = null; // link inválido/expirado/já preenchido → 404 do backend
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold text-vero-700">Anamnese</h1>
      {form ? (
        <>
          <p className="mb-6 text-sm text-slate-500">
            Olá, {form.patientName}. Responda às perguntas abaixo e assine. Suas
            respostas são confidenciais e ficam no seu prontuário.
          </p>
          <AnamnesisFillForm
            token={token}
            templateName={form.templateName}
            questions={form.questions}
          />
        </>
      ) : (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Este link de anamnese é inválido, expirou ou já foi preenchido. Se
          precisar, peça um novo link à sua clínica.
        </p>
      )}
    </main>
  );
}
