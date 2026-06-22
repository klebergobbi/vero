"use server";

import { ApiError, createApiClient } from "@vero/api-client";
import { apiBaseUrl } from "../../../lib/session";

// Cliente público (sem token): /anamnesis/fill/* é resolvido só pelo token (§S28).
const publicApi = () => createApiClient({ baseUrl: apiBaseUrl });

/** Submete as respostas e assina a anamnese remotamente (Server Action). */
export async function submitAnamnesisAction(
  token: string,
  answers: Record<string, string>,
): Promise<{ ok?: true; error?: string }> {
  try {
    await publicApi().submitAnamnesis(token, answers);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      return { error: "Esta anamnese já foi preenchida." };
    }
    if (e instanceof ApiError && e.status === 404) {
      return { error: "Link inválido ou expirado." };
    }
    return { error: "Não foi possível enviar agora. Tente novamente." };
  }
}
