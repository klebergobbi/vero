"use server";

import { serverApi } from "../../lib/api";

type Err = { error?: string };

export async function createSourceAction(input: {
  name: string;
  costReais: string;
}): Promise<Err> {
  if (!input.name.trim()) return { error: "Informe o nome do canal." };
  try {
    const api = await serverApi();
    await api.createLeadSource({
      name: input.name.trim(),
      costCents: Math.round(Number(input.costReais || 0) * 100),
    });
    return {};
  } catch {
    return { error: "Não foi possível criar o canal." };
  }
}

export async function createLeadAction(input: {
  name: string;
  phone: string;
  leadSourceId: string;
  referredByPatientId: string;
  city: string;
  birthDate: string;
}): Promise<Err> {
  if (!input.name.trim() || !input.phone.trim()) {
    return { error: "Informe nome e telefone." };
  }
  try {
    const api = await serverApi();
    await api.createLead({
      name: input.name.trim(),
      phone: input.phone.trim(),
      ...(input.leadSourceId ? { leadSourceId: input.leadSourceId } : {}),
      ...(input.referredByPatientId
        ? { referredByPatientId: input.referredByPatientId }
        : {}),
      ...(input.city.trim() ? { city: input.city.trim() } : {}),
      ...(input.birthDate
        ? { birthDate: `${input.birthDate}T00:00:00.000Z` }
        : {}),
    });
    return {};
  } catch {
    return {
      error: "Não foi possível criar o lead (canal/indicador inválido?).",
    };
  }
}

export async function updateStatusAction(input: {
  id: string;
  status: string;
  valueReais: string;
}): Promise<Err> {
  try {
    const api = await serverApi();
    await api.updateLeadStatus(input.id, {
      status: input.status,
      ...(input.status === "CLOSED"
        ? { valueCents: Math.round(Number(input.valueReais || 0) * 100) }
        : {}),
    });
    return {};
  } catch {
    return {
      error:
        input.status === "CLOSED"
          ? "Para fechar, informe o valor."
          : "Não foi possível mover o lead.",
    };
  }
}
