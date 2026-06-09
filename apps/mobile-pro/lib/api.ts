/**
 * Client HTTP do App do Profissional (CLAUDE.md §2 — thin client). Self-contained
 * (não importa pacote do workspace, p/ evitar resolução de symlink no Metro).
 * O profissional é um User de EQUIPE → reusa a auth da S3 (/auth/login) e a leitura
 * tenant-scoped da agenda (GET /appointments). NENHUM segredo aqui.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface StaffLoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

/** Agendamento como devolvido por GET /appointments (campos usados na agenda). */
export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
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
  login: (input: StaffLoginInput): Promise<TokenPair> =>
    request<TokenPair>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  refresh: (refreshToken: string): Promise<TokenPair> =>
    request<TokenPair>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string): Promise<void> =>
    request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  /** Agenda em [fromISO, toISO) — a tela passa a janela do dia local. */
  appointmentsForDay: (
    accessToken: string,
    fromISO: string,
    toISO: string,
  ): Promise<Appointment[]> =>
    request<Appointment[]>(
      `/appointments?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
      { accessToken },
    ),
};
