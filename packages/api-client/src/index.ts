/**
 * Client HTTP tipado do backend Vero (CLAUDE.md §2 — thin client). NÃO guarda
 * segredos: recebe baseUrl e, quando preciso, um token. Usado SERVER-SIDE no
 * `apps/web` (Server Actions / middleware), nunca expõe nada ao browser.
 */
import type { AppointmentStatus } from "@vero/types";

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

/** Resumo de paciente para seletores na agenda (espelha o model, campos mínimos). */
export interface PatientSummary {
  id: string;
  name: string;
  phone: string;
}

/** Resumo de unidade para o seletor da agenda (id + name). */
export interface UnitSummary {
  id: string;
  name: string;
}

/** Resumo de profissional (User) para o seletor da agenda (id + name). */
export interface ProfessionalSummary {
  id: string;
  name: string;
}

/** Agendamento como devolvido pela API (instantes em ISO 8601). */
export interface Appointment {
  id: string;
  unitId: string;
  professionalId: string;
  patientId: string;
  roomId: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  markers: string[];
  notes: string | null;
}

/** Filtros da listagem da agenda (todos opcionais). */
export interface ListAppointmentsParams {
  from?: string;
  to?: string;
  professionalId?: string;
  unitId?: string;
}

/** Criação de agendamento (validação real é no DTO do backend, §4). */
export interface CreateAppointmentInput {
  unitId: string;
  professionalId: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  roomId?: string;
  notes?: string;
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

    // --- Recursos de negócio (autenticados via accessToken) ---

    listPatients: (q?: string): Promise<PatientSummary[]> =>
      request<PatientSummary[]>(
        baseUrl,
        `/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        { accessToken },
      ),

    listUnits: (): Promise<UnitSummary[]> =>
      request<UnitSummary[]>(baseUrl, "/units", { accessToken }),

    listProfessionals: (): Promise<ProfessionalSummary[]> =>
      request<ProfessionalSummary[]>(baseUrl, "/professionals", {
        accessToken,
      }),

    listAppointments: (
      params: ListAppointmentsParams = {},
    ): Promise<Appointment[]> => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<Appointment[]>(baseUrl, `/appointments${suffix}`, {
        accessToken,
      });
    },

    createAppointment: (input: CreateAppointmentInput): Promise<Appointment> =>
      request<Appointment>(baseUrl, "/appointments", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    /** Requisição autenticada genérica (escape hatch para recursos ainda sem método). */
    request: <T>(path: string, init?: RequestInit): Promise<T> =>
      request<T>(baseUrl, path, { ...init, accessToken }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
