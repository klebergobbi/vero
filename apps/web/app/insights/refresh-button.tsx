"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshInsightsAction } from "./actions";

export function RefreshButton() {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshInsightsAction();
          router.refresh();
        })
      }
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "Gerando…" : "Atualizar (gera de novo via IA)"}
    </button>
  );
}
