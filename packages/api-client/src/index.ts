/**
 * Client HTTP tipado do backend Vero (CLAUDE.md §2 — thin client). NÃO guarda
 * segredos: recebe baseUrl e, quando preciso, um token. Usado SERVER-SIDE no
 * `apps/web` (Server Actions / middleware), nunca expõe nada ao browser.
 */

export interface ApiClientOptions {
  baseUrl: string;
  /** token de acesso a anexar como Bearer (opcional). */
  accessToken?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

/** Erro HTTP tipado (status + mensagem segura, sem stack do servidor). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit & { accessToken?: string | undefined },
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Falha na requisição (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function createApiClient(opts: ApiClientOptions) {
  const { baseUrl, accessToken } = opts;
  return {
    login: (input: LoginInput): Promise<TokenPair> =>
      request<TokenPair>(baseUrl, "/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    refresh: (refreshToken: string): Promise<TokenPair> =>
      request<TokenPair>(baseUrl, "/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    logout: (refreshToken: string): Promise<void> =>
      request<void>(baseUrl, "/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    /** Requisição autenticada genérica (recursos de negócio chegam na S7b). */
    request: <T>(path: string, init?: RequestInit): Promise<T> =>
      request<T>(baseUrl, path, { ...init, accessToken }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
