import Link from "next/link";
import type { PatientSummary, ProstheticOrder } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { ProstheticList } from "./prosthetic-list";

export const dynamic = "force-dynamic";

export default async function ProtesePage() {
  const api = await serverApi();

  let orders: ProstheticOrder[] = [];
  let patients: PatientSummary[] = [];
  try {
    [orders, patients] = await Promise.all([
      api.listProstheticOrders(),
      api.listPatients(),
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
      <h1 className="mb-1 text-2xl font-bold text-vero-700">
        Controle protético
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Rastreie o envio e o retorno dos trabalhos do laboratório. Pedidos
        atrasados ficam destacados.
      </p>
      <ProstheticList initialOrders={orders} patients={patients} />
    </main>
  );
}
