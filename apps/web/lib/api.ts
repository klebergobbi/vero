import { createApiClient, type ApiClient } from "@vero/api-client";
import { apiBaseUrl, getAccessToken } from "./session";

/**
 * Client da API autenticado para uso SERVER-SIDE (Server Components / Actions).
 * Lê o access token do cookie httpOnly — o middleware já o renovou de forma
 * transparente antes de chegar aqui (S7a). Thin client: nenhum segredo vaza ao
 * browser, todas as chamadas saem do servidor do Next (CLAUDE.md §2/§5).
 */
export async function serverApi(): Promise<ApiClient> {
  const accessToken = await getAccessToken();
  return createApiClient({ baseUrl: apiBaseUrl, accessToken });
}
