"use server";

import type { OdontogramData } from "@vero/api-client";
import { serverApi } from "../../../lib/api";

/** Marca/limpa a condição de um dente/face e devolve o odontograma atualizado. */
export async function setToothConditionAction(
  patientId: string,
  input: { toothNumber: number; face: string; condition: string },
): Promise<OdontogramData | { error: string }> {
  try {
    const api = await serverApi();
    return await api.setToothCondition(patientId, input);
  } catch {
    return { error: "Não foi possível salvar a condição." };
  }
}
