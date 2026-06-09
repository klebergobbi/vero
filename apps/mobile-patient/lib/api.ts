/**
 * Client HTTP do App do Paciente (CLAUDE.md §2 — thin client). Self-contained
 * (não importa pacote do workspace, p/ evitar resolução de symlink no Metro).
 * NENHUM segredo aqui: só fala com o backend, que detém integrações e segredos.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface PatientLoginInput {
  tenantSlug: string;
  identifier: string; // CPF ou e-mail
  password: string;
}

/** Consulta do paciente (campos mínimos; espelha o retorno de /me/appointments). */
export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

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
  path: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Falha na requisição (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login: (input: PatientLoginInput): Promise<TokenPair> =>
    request<TokenPair>("/auth/patient/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  refresh: (refreshToken: string): Promise<TokenPair> =>
    request<TokenPair>("/auth/patient/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string): Promise<void> =>
    request<void>("/auth/patient/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  myAppointments: (accessToken: string): Promise<Appointment[]> =>
    request<Appointment[]>("/me/appointments", { accessToken }),
};
