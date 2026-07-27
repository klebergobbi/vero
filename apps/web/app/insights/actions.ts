"use server";

import { serverApi } from "../../lib/api";

export async function refreshInsightsAction(): Promise<{ error?: string }> {
  try {
    const api = await serverApi();
    await api.invalidateInsights();
    return {};
  } catch {
    return { error: "Não foi possível atualizar os insights." };
  }
}
