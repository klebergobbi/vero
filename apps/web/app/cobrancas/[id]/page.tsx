import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChargeDetail } from "@vero/api-client";
import { serverApi } from "../../../lib/api";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  CARD: "Cartão",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ChargePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();

  let charge: ChargeDetail;
  try {
    charge = await api.getCharge(id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/orcamentos"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>

      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vero-700">
            {charge.patient.name}
          </h1>
          <p className="text-sm text-slate-500">
            Cobrança · {METHOD_LABELS[charge.method] ?? charge.method} ·{" "}
            {charge.installments.length}x
          </p>
        </div>
        <span className="text-2xl font-bold text-vero-700">
          {brl(charge.totalCents)}
        </span>
      </header>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {charge.installments.map((it) => (
          <li key={it.id} className="px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">
                Parcela {it.number} · vence{" "}
                {new Date(it.dueDate).toLocaleDateString("pt-BR")}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">
                  {brl(it.amountCents)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {STATUS_LABELS[it.status] ?? it.status}
                </span>
              </span>
            </div>
            {it.pixPayload ? (
              <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                PIX copia-e-cola: {it.pixPayload}
              </p>
            ) : null}
            {it.boletoBarcode ? (
              <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                Boleto: {it.boletoBarcode}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
