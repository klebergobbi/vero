import { notFound } from "next/navigation";
import {
  createApiClient,
  type ProfessionalSummary,
  type UnitSummary,
} from "@vero/api-client";
import { apiBaseUrl } from "../../../lib/session";
import { BookingForm } from "./booking-form";

// Página PÚBLICA (sem login — liberada no middleware). Dados por requisição.
export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const api = createApiClient({ baseUrl: apiBaseUrl });

  let units: UnitSummary[] = [];
  let professionals: ProfessionalSummary[] = [];
  try {
    [units, professionals] = await Promise.all([
      api.listClinicUnits(slug),
      api.listClinicProfessionals(slug),
    ]);
  } catch {
    notFound(); // clínica inexistente → 404
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-vero-700">Agendar consulta</h1>
        <p className="text-sm text-slate-500">
          Escolha o profissional e o horário que preferir.
        </p>
      </header>
      <BookingForm slug={slug} units={units} professionals={professionals} />
    </main>
  );
}
