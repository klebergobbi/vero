"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@vero/api-client";
import { serverApi } from "../../lib/api";

export interface CreateAppointmentState {
  error?: string;
  ok?: boolean;
}

/**
 * Cria um agendamento via BFF. O backend é a barreira real (§4): valida DTO,
 * checa conflito (409) e disponibilidade. Aqui só traduzimos o erro para uma
 * mensagem segura — nunca expomos detalhe interno do servidor.
 */
export async function createAppointmentAction(
  _prev: CreateAppointmentState,
  formData: FormData,
): Promise<CreateAppointmentState> {
  const unitId = String(formData.get("unitId") ?? "").trim();
  const professionalId = String(formData.get("professionalId") ?? "").trim();
  const patientId = String(formData.get("patientId") ?? "").trim();
  const startsAtLocal = String(formData.get("startsAt") ?? "").trim();
  const endsAtLocal = String(formData.get("endsAt") ?? "").trim();

  if (
    !unitId ||
    !professionalId ||
    !patientId ||
    !startsAtLocal ||
    !endsAtLocal
  ) {
    return { error: "Preencha unidade, profissional, paciente e horários." };
  }

  // datetime-local não tem fuso → interpreta como horário local e envia ISO (UTC).
  const startsAt = new Date(startsAtLocal);
  const endsAt = new Date(endsAtLocal);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Horário inválido." };
  }
  if (startsAt >= endsAt) {
    return { error: "O início deve ser antes do fim." };
  }

  try {
    const api = await serverApi();
    await api.createAppointment({
      unitId,
      professionalId,
      patientId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        return {
          error: "Horário em conflito (profissional ou sala ocupados).",
        };
      }
      if (err.status === 400) {
        return { error: "Dados inválidos ou fora da disponibilidade." };
      }
      if (err.status === 403) {
        return { error: "Você não tem permissão para isso." };
      }
    }
    return { error: "Não foi possível criar o agendamento. Tente novamente." };
  }

  revalidatePath("/agenda");
  return { ok: true };
}
