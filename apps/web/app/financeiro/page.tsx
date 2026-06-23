import Link from "next/link";
import type { Account, AccountSummary } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { AccountsList } from "./accounts-list";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const api = await serverApi();

  let accounts: Account[] = [];
  let summary: AccountSummary = { payableOpenCents: 0, receivableOpenCents: 0 };
  try {
    [accounts, summary] = await Promise.all([
      api.listAccounts(),
      api.accountsSummary(),
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
        Contas a pagar e receber
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Lançamentos financeiros da clínica. Dê baixa quando pagar ou receber.
      </p>
      <AccountsList initialAccounts={accounts} initialSummary={summary} />
    </main>
  );
}
