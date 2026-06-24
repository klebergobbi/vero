"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UnitSummary } from "@vero/api-client";
import { switchUnitAction } from "./actions";

/**
 * Seletor de unidade ativa (§S45). Lista só as unidades autorizadas (servidor) e,
 * ao trocar, chama a Server Action que revalida no backend e regrava a sessão.
 */
export function UnitSwitcher({
  units,
  activeUnitId,
}: {
  units: UnitSummary[];
  activeUnitId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (units.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="text-slate-400">Unidade</span>
      <select
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
        value={activeUnitId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const unitId = e.target.value;
          if (!unitId || unitId === activeUnitId) return;
          start(async () => {
            const res = await switchUnitAction(unitId);
            if (res.error) alert(res.error);
            else router.refresh();
          });
        }}
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
