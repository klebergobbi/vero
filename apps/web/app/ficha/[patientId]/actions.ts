"use server";

import { ApiError, type SpecialtyFormData } from "@vero/api-client";
import { serverApi } from "../../../lib/api";

/** Lê a versão corrente + histórico de uma ficha (Server Action). */
export async function getSpecialtyAction(
  patientId: string,
  specialty: string,
): Promise<{ data?: SpecialtyFormData; error?: string }> {
  try {
    const api = await serverApi();
    const data = await api.getSpecialtyForm(patientId, specialty);
    return { data };
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return { error: "Sem permissão para ver esta ficha." };
    }
    return { error: "Não foi possível carregar a ficha agora." };
  }
}

/** Salva uma nova versão da ficha (Server Action). */
export async function saveSpecialtyAction(
  patientId: string,
  specialty: string,
  values: Record<string, unknown>,
): Promise<{ version?: number; error?: string }> {
  try {
    const api = await serverApi();
    const res = await api.saveSpecialtyForm(patientId, specialty, values);
    return { version: res.version };
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      return { error: "Dados inválidos." };
    }
    if (e instanceof ApiError && e.status === 403) {
      return { error: "Sem permissão para editar esta ficha." };
    }
    return { error: "Não foi possível salvar agora." };
  }
}
