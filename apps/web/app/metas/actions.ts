"use server";

import type { GoalProgress } from "@vero/api-client";
import { serverApi } from "../../lib/api";

interface Result {
  goals?: GoalProgress[];
  error?: string;
}

export async function createGoalAction(input: {
  professionalId?: string;
  metric: string;
  targetValue: number;
  periodStart: string;
  periodEnd: string;
}): Promise<Result> {
  if (input.targetValue <= 0 || !input.periodStart || !input.periodEnd) {
    return { error: "Preencha alvo e período." };
  }
  try {
    const api = await serverApi();
    await api.createGoal(input);
    return { goals: await api.listGoals() };
  } catch {
    return { error: "Não foi possível criar a meta (verifique o período)." };
  }
}

export async function deleteGoalAction(id: string): Promise<Result> {
  try {
    const api = await serverApi();
    await api.deleteGoal(id);
    return { goals: await api.listGoals() };
  } catch {
    return { error: "Não foi possível remover a meta." };
  }
}
