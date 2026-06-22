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

/** Retorno de POST /me/appointments/:id/confirm. */
export interface ConfirmResult {
  id: string;
  status: string;
  alreadyConfirmed: boolean;
}

/** Retorno de POST /me/appointments/:id/checkin. */
export interface CheckInResult {
  id: string;
  status: string;
  alreadyCheckedIn: boolean;
}

/** Item de seletor (unidade ou profissional). */
export interface NamedRef {
  id: string;
  name: string;
}

/** Parcela do paciente (§S21). */
export interface InstallmentSummary {
  id: string;
  number: number;
  amountCents: number;
  dueDate: string;
  status: string;
  pixPayload: string | null;
  boletoBarcode: string | null;
  charge: { method: string };
}

/** Contrato — resumo (§S18). */
export interface ContractSummary {
  id: string;
  status: string;
  createdAt: string;
  signedAt: string | null;
}

/** Contrato — detalhe (corpo + assinaturas). */
export interface ContractDetail extends ContractSummary {
  body: string;
  contentHash: string;
  signatures: { signerName: string; signedAt: string }[];
}

/** Slot livre para agendamento online (§S15c). */
export interface OpenSlot {
  start: string;
  end: string;
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

  /** Confirma presença na própria consulta (idempotente — §S11). */
  confirmAppointment: (
    accessToken: string,
    appointmentId: string,
  ): Promise<ConfirmResult> =>
    request<ConfirmResult>(`/me/appointments/${appointmentId}/confirm`, {
      method: "POST",
      accessToken,
    }),

  /** Self check-in ao chegar na própria consulta (idempotente — §S14). */
  checkIn: (
    accessToken: string,
    appointmentId: string,
  ): Promise<CheckInResult> =>
    request<CheckInResult>(`/me/appointments/${appointmentId}/checkin`, {
      method: "POST",
      accessToken,
    }),

  /** Exclui a própria conta (anonimiza + bloqueia login — §5 loja). */
  deleteAccount: (accessToken: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>("/me", { method: "DELETE", accessToken }),

  /** Registra/atualiza o device de push deste paciente (§S13c). */
  registerDevice: (
    accessToken: string,
    token: string,
    platform: "IOS" | "ANDROID",
  ): Promise<{ id: string; optedOut: boolean }> =>
    request("/me/devices", {
      method: "POST",
      accessToken,
      body: JSON.stringify({ token, platform }),
    }),

  /** Liga/desliga o recebimento de push deste device. */
  optOutDevice: (
    accessToken: string,
    token: string,
    optedOut: boolean,
  ): Promise<{ ok: boolean; optedOut: boolean }> =>
    request("/me/devices/opt-out", {
      method: "POST",
      accessToken,
      body: JSON.stringify({ token, optedOut }),
    }),

  /** Remove o device (logout). */
  unregisterDevice: (accessToken: string, token: string): Promise<void> =>
    request("/me/devices/unregister", {
      method: "POST",
      accessToken,
      body: JSON.stringify({ token }),
    }),

  // --- Agendamento online do paciente logado (§S15c) ---

  meUnits: (accessToken: string): Promise<NamedRef[]> =>
    request<NamedRef[]>("/me/units", { accessToken }),

  meProfessionals: (accessToken: string): Promise<NamedRef[]> =>
    request<NamedRef[]>("/me/professionals", { accessToken }),

  meSlots: (
    accessToken: string,
    params: { unitId: string; professionalId: string; date: string },
  ): Promise<OpenSlot[]> => {
    const qs = new URLSearchParams(params).toString();
    return request<OpenSlot[]>(`/me/slots?${qs}`, { accessToken });
  },

  meBook: (
    accessToken: string,
    input: { unitId: string; professionalId: string; startsAt: string },
  ): Promise<{ appointmentId: string; startsAt: string; status: string }> =>
    request("/me/book", {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),

  // --- Financeiro do paciente (§S21) ---

  myInstallments: (accessToken: string): Promise<InstallmentSummary[]> =>
    request<InstallmentSummary[]>("/me/installments", { accessToken }),

  // --- Contratos do paciente (§S18) ---

  myContracts: (accessToken: string): Promise<ContractSummary[]> =>
    request<ContractSummary[]>("/me/contracts", { accessToken }),

  getContract: (accessToken: string, id: string): Promise<ContractDetail> =>
    request<ContractDetail>(`/me/contracts/${id}`, { accessToken }),

  signContract: (
    accessToken: string,
    id: string,
    signerName?: string,
  ): Promise<ContractDetail> =>
    request<ContractDetail>(`/me/contracts/${id}/sign`, {
      method: "POST",
      accessToken,
      body: JSON.stringify(signerName ? { signerName } : {}),
    }),
};
