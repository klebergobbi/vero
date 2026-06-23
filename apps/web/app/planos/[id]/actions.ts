"use server";

import { ApiError, type TreatmentPlanDetail } from "@vero/api-client";
import { serverApi } from "../../../lib/api";

/** Registra uma sessão executada de um item (Server Action). */
export async function executeItemAction(
  itemId: string,
  notes: string,
): Promise<{ plan?: TreatmentPlanDetail; error?: string }> {
  try {
    const api = await serverApi();
    const plan = await api.executeTreatmentItem(itemId, {
      ...(notes ? { notes } : {}),
    });
    return { plan };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      return { error: "Item já concluído." };
    }
    if (e instanceof ApiError && e.status === 403) {
      return { error: "Sem permissão para registrar." };
    }
    return { error: "Não foi possível registrar agora." };
  }
}
