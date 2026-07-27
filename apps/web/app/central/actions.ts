"use server";

import { serverApi } from "../../lib/api";

export async function bookCentralAction(formData: FormData) {
  const api = await serverApi();
  if (!api) return { error: "Sessão expirada. Faça login novamente." };

  const unitId = formData.get("unitId") as string;
  const professionalId = formData.get("professionalId") as string;
  const patientId = formData.get("patientId") as string;
  const datetimeLocal = formData.get("startsAt") as string;
  const endsDatetime = formData.get("endsAt") as string;
  const notes = (formData.get("notes") as string) || undefined;

  if (
    !unitId ||
    !professionalId ||
    !patientId ||
    !datetimeLocal ||
    !endsDatetime
  ) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const startsAt = new Date(datetimeLocal).toISOString();
  const endsAt = new Date(endsDatetime).toISOString();

  try {
    await api.bookCentralAppointment({
      unitId,
      professionalId,
      patientId,
      startsAt,
      endsAt,
      notes,
    });
    return { success: true };
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 409)
      return { error: "Conflito de horário na unidade selecionada." };
    if (status === 403) return { error: "Sem acesso à unidade selecionada." };
    if (status === 400)
      return { error: "Dados inválidos ou fora da disponibilidade." };
    return { error: "Erro ao criar agendamento." };
  }
}
