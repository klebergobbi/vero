"use server";

import {
  ApiError,
  createApiClient,
  type OpenSlot,
  type PublicBookInput,
  type PublicBookResult,
} from "@vero/api-client";
import { apiBaseUrl } from "../../../lib/session";

// Cliente público (sem token): as rotas /public/* não exigem auth (§S15).
const publicApi = () => createApiClient({ baseUrl: apiBaseUrl });

/** Busca os horários livres de um profissional num dia (Server Action). */
export async function getSlotsAction(
  slug: string,
  unitId: string,
  professionalId: string,
  date: string,
): Promise<{ slots?: OpenSlot[]; error?: string }> {
  if (!unitId || !professionalId || !date) {
    return { error: "Selecione unidade, profissional e data." };
  }
  try {
    const slots = await publicApi().listClinicSlots(slug, {
      unitId,
      professionalId,
      date,
    });
    return { slots };
  } catch {
    return { error: "Não foi possível buscar horários agora." };
  }
}

/** Reserva um slot livre criando o lead + a consulta (Server Action). */
export async function bookAction(
  slug: string,
  input: PublicBookInput,
): Promise<{ ok?: PublicBookResult; error?: string }> {
  try {
    const ok = await publicApi().bookClinic(slug, input);
    return { ok };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        return { error: "Esse horário acabou de ser ocupado. Escolha outro." };
      }
      if (err.status === 400)
        return { error: "Verifique os dados informados." };
      if (err.status === 404) return { error: "Clínica não encontrada." };
    }
    return { error: "Não foi possível concluir o agendamento." };
  }
}
