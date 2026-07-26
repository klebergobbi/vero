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

/** Resultado da troca de unidade ativa (§S45): novo par de tokens + unidade ativa. */
export interface SwitchUnitResult extends TokenPair {
  unitId: string;
}

/** Linha do ranking de unidades (§S46): comparativo do franqueador. */
export interface UnitRankRow {
  unitId: string;
  name: string;
  billedCents: number;
  appointments: number;
  completed: number;
  noShow: number;
  approvedBudgets: number;
  rejectedBudgets: number;
  conversionPercent: number;
}

/** Resumo de profissional (User) para o seletor da agenda (id + name). */
export interface ProfessionalSummary {
  id: string;
  name: string;
}

/** Entrada da fila de espera (self check-in — §S14). */
export interface WaitListEntry {
  id: string;
  appointmentId: string;
  patientId: string;
  unitId: string;
  status: string;
  arrivedAt: string;
}

/** Slot livre devolvido pelo agendamento online público (§S15). */
export interface OpenSlot {
  start: string;
  end: string;
}

/** Catálogo — procedimento (§S16). */
export interface ProcedureItem {
  id: string;
  name: string;
  code: string | null;
  durationMinutes: number | null;
  active: boolean;
}

/** Catálogo — convênio/plano (§S16). */
export interface PlanItem {
  id: string;
  name: string;
  active: boolean;
}

/** Catálogo — preço por convênio, com nomes (§S16). */
export interface PriceItem {
  id: string;
  procedureId: string;
  planId: string;
  priceCents: number;
  active: boolean;
  procedure: { name: string };
  plan: { name: string };
}

/** Odontograma — condição por dente/face (§S27). */
export interface ToothCondition {
  toothNumber: number;
  face: string;
  condition: string;
}

export interface OdontogramData {
  id: string;
  conditions: ToothCondition[];
}

/** Ficha por especialidade (§S29) — versão corrente + histórico. */
export interface SpecialtyVersionMeta {
  version: number;
  authorId: string;
  createdAt: string;
}
export interface SpecialtyFormData {
  specialty: string;
  version: number;
  values: Record<string, unknown>;
  history: SpecialtyVersionMeta[];
}

/** Anamnese digital (§S28) — formulário público resolvido por token de uso único. */
export interface AnamnesisQuestion {
  id: string;
  label: string;
}
export interface AnamnesisForm {
  status: string;
  patientName: string;
  templateName: string;
  questions: AnamnesisQuestion[];
}
export interface AnamnesisSignResult {
  status: string;
  contentHash: string;
  signedAt: string;
}

/** Orçamento — resumo para a listagem (§S17). */
export interface BudgetSummary {
  id: string;
  patientId: string;
  status: string;
  totalCents: number;
  createdAt: string;
  patient: { name: string };
}

/** Item de orçamento (snapshot). */
export interface BudgetItemDetail {
  id: string;
  procedureId: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

/** Orçamento detalhado (com itens). */
export interface BudgetDetail extends BudgetSummary {
  planId: string | null;
  notes: string | null;
  decidedAt: string | null;
  items: BudgetItemDetail[];
  contract: { id: string; status: string } | null;
  charge: { id: string; status: string } | null;
  treatmentPlan: { id: string; status: string } | null;
}

/** Relatório exportável (§S43). `url` presente quando READY (via getReport). */
export interface ReportItem {
  id: string;
  type: string;
  format: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  rowCount: number | null;
  error: string | null;
  createdAt: string;
  url?: string;
  expiresAt?: string;
}

/** CRM (§S44). */
export interface LeadChannelItem {
  id: string;
  name: string;
  costCents: number;
  active: boolean;
}
export interface CrmLeadItem {
  id: string;
  name: string;
  phone: string;
  leadSourceId: string | null;
  referredByPatientId: string | null;
  status: string;
  valueCents: number;
  city: string | null;
  birthDate: string | null;
  createdAt: string;
  leadSource: { name: string } | null;
}
export interface CrmSourceReport {
  sourceId: string;
  name: string;
  costCents: number;
  leads: number;
  closed: number;
  revenueCents: number;
  roiCents: number;
}
export interface CrmReferral {
  id: string;
  referrerName: string;
  leadName: string;
  leadStatus: string;
  createdAt: string;
}
export interface CrmDemographics {
  byAge: { range: string; count: number }[];
  byCity: { city: string; count: number }[];
}

/** Dashboard analítico (§S42). */
export interface DashboardData {
  period: { from: string; to: string };
  kpis: {
    revenueCents: number;
    billedCents: number;
    appointmentsCount: number;
    conversionPercent: number;
    approvedBudgets: number;
    rejectedBudgets: number;
  };
  series: { month: string; revenueCents: number; appointments: number }[];
  generatedAt: string;
  cached: boolean;
}

/** Meta com progresso (§S41). */
export interface GoalProgress {
  id: string;
  professionalId: string | null;
  metric: string;
  targetValue: number;
  periodStart: string;
  periodEnd: string;
  professional: { name: string } | null;
  realized: number;
  percent: number;
}

/** Comissões (§S40). */
export interface CommissionRuleItem {
  id: string;
  professionalId: string;
  procedureId: string | null;
  percent: number;
  professional: { name: string };
}
export interface CommissionEntry {
  id: string;
  professionalId: string;
  procedureId: string | null;
  description: string;
  baseCents: number;
  percent: number;
  amountCents: number;
  status: string;
  reference: string | null;
  date: string;
  paidAt: string | null;
  professional: { name: string };
}
export interface CommissionTotal {
  professionalId: string;
  name: string;
  totalCents: number;
}
export interface CommissionReport {
  entries: CommissionEntry[];
  totals: CommissionTotal[];
}

/** Estoque (§S39). */
export interface InventoryItemBase {
  id: string;
  inventoryId: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  createdAt: string;
}
export interface InventoryItem extends InventoryItemBase {
  isLow: boolean;
}
export interface ExpiringBatch {
  id: string;
  code: string | null;
  quantity: number;
  expiresAt: string | null;
  item: { id: string; name: string; unit: string };
}
export interface InventoryAlerts {
  lowStock: InventoryItemBase[];
  expiring: ExpiringBatch[];
}

/** Movimento de caixa (§S38). */
export interface CashFlowEntry {
  id: string;
  direction: string;
  amountCents: number;
  date: string;
  category: string;
  description: string;
  source: string;
  paymentId: string | null;
  accountId: string | null;
  createdAt: string;
  reconciled: boolean;
  reconcileMethod: string | null;
}
export interface CashSummary {
  inCents: number;
  outCents: number;
  balanceCents: number;
}

/** Conta a pagar/receber da clínica (§S37). */
export interface Account {
  id: string;
  type: string;
  description: string;
  category: string;
  amountCents: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  isOverdue: boolean;
}
export interface AccountSummary {
  payableOpenCents: number;
  receivableOpenCents: number;
}

/** Imagem intraoral do prontuário (§S36). URLs assinadas (full + thumbnail). */
export interface RecordImage {
  id: string;
  filename: string;
  contentType: string;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
}

/** Pedido protético — controle de laboratório (§S35). */
export interface ProstheticOrder {
  id: string;
  patientId: string;
  treatmentItemId: string | null;
  labName: string;
  description: string;
  status: string;
  sentAt: string | null;
  expectedReturnDate: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  patient: { name: string };
  isLate: boolean;
}

/** Tarefa da Central de Relacionamento (§S34). */
export interface CrcTask {
  id: string;
  patientId: string;
  type: string;
  status: string;
  priority: number;
  dueDate: string | null;
  notes: string | null;
  assignedToId: string | null;
  doneAt: string | null;
  createdAt: string;
  patient: { name: string; phone: string };
  assignedTo: { name: string } | null;
}

/** Documento clínico — atestado/receituário (§S32). */
export interface ClinicalDocumentSummary {
  id: string;
  patientId: string;
  type: string;
  title: string;
  status: string;
  signerName: string | null;
  signedAt: string | null;
  createdAt: string;
}
export interface DocumentVerification {
  id: string;
  integrityOk: boolean;
  signedOk: boolean;
  valid: boolean;
  signerName: string | null;
  signedAt: string | null;
  contentHash: string;
}

/** Plano de tratamento (§S30). */
export interface ExecutionEntry {
  id: string;
  performedById: string;
  performedAt: string;
  notes: string | null;
}
export interface TreatmentItemDetail {
  id: string;
  description: string;
  quantity: number;
  doneCount: number;
  status: string;
  executions: ExecutionEntry[];
}
export interface TreatmentPlanDetail {
  id: string;
  patientId: string;
  budgetId: string;
  status: string;
  createdAt: string;
  items: TreatmentItemDetail[];
}

/** Parcela de uma cobrança (§S19). */
export interface InstallmentDetail {
  id: string;
  number: number;
  amountCents: number;
  dueDate: string;
  status: string;
  pixPayload: string | null;
  boletoBarcode: string | null;
}

/** Cobrança detalhada (com parcelas). */
export interface ChargeDetail {
  id: string;
  patientId: string;
  totalCents: number;
  method: string;
  status: string;
  patient: { name: string };
  installments: InstallmentDetail[];
}

/** Dados do booking público (paciente se identifica como lead). */
export interface PublicBookInput {
  unitId: string;
  professionalId: string;
  startsAt: string;
  name: string;
  phone: string;
  cpf?: string;
}

export interface PublicBookResult {
  appointmentId: string;
  startsAt: string;
  status: string;
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

    listWaitList: (): Promise<WaitListEntry[]> =>
      request<WaitListEntry[]>(baseUrl, "/waitlist", { accessToken }),

    // --- Agendamento online PÚBLICO (sem auth; tenant pelo slug — §S15) ---

    listClinicUnits: (slug: string): Promise<UnitSummary[]> =>
      request<UnitSummary[]>(
        baseUrl,
        `/public/clinics/${encodeURIComponent(slug)}/units`,
        {},
      ),

    listClinicProfessionals: (slug: string): Promise<ProfessionalSummary[]> =>
      request<ProfessionalSummary[]>(
        baseUrl,
        `/public/clinics/${encodeURIComponent(slug)}/professionals`,
        {},
      ),

    listClinicSlots: (
      slug: string,
      params: { unitId: string; professionalId: string; date: string },
    ): Promise<OpenSlot[]> => {
      const qs = new URLSearchParams(params).toString();
      return request<OpenSlot[]>(
        baseUrl,
        `/public/clinics/${encodeURIComponent(slug)}/slots?${qs}`,
        {},
      );
    },

    bookClinic: (
      slug: string,
      input: PublicBookInput,
    ): Promise<PublicBookResult> =>
      request<PublicBookResult>(
        baseUrl,
        `/public/clinics/${encodeURIComponent(slug)}/book`,
        { method: "POST", body: JSON.stringify(input) },
      ),

    // --- Catálogo comercial (§S16, gated catalog:read|write no backend) ---

    listProcedures: (): Promise<ProcedureItem[]> =>
      request<ProcedureItem[]>(baseUrl, "/procedures", { accessToken }),

    createProcedure: (input: {
      name: string;
      code?: string;
      durationMinutes?: number;
    }): Promise<ProcedureItem> =>
      request<ProcedureItem>(baseUrl, "/procedures", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    listPlans: (): Promise<PlanItem[]> =>
      request<PlanItem[]>(baseUrl, "/plans", { accessToken }),

    createPlan: (input: { name: string }): Promise<PlanItem> =>
      request<PlanItem>(baseUrl, "/plans", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    listPrices: (): Promise<PriceItem[]> =>
      request<PriceItem[]>(baseUrl, "/prices", { accessToken }),

    createPrice: (input: {
      procedureId: string;
      planId: string;
      priceCents: number;
    }): Promise<PriceItem> =>
      request<PriceItem>(baseUrl, "/prices", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    // --- Orçamentos (§S17, gated budget:read|write) ---

    listBudgets: (): Promise<BudgetSummary[]> =>
      request<BudgetSummary[]>(baseUrl, "/budgets", { accessToken }),

    createBudget: (input: {
      patientId: string;
      planId?: string;
      notes?: string;
    }): Promise<BudgetDetail> =>
      request<BudgetDetail>(baseUrl, "/budgets", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    getBudget: (id: string): Promise<BudgetDetail> =>
      request<BudgetDetail>(baseUrl, `/budgets/${id}`, { accessToken }),

    addBudgetItem: (
      id: string,
      input: {
        procedureId: string;
        quantity?: number;
        unitPriceCents?: number;
      },
    ): Promise<BudgetDetail> =>
      request<BudgetDetail>(baseUrl, `/budgets/${id}/items`, {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    removeBudgetItem: (id: string, itemId: string): Promise<BudgetDetail> =>
      request<BudgetDetail>(baseUrl, `/budgets/${id}/items/${itemId}`, {
        method: "DELETE",
        accessToken,
      }),

    setBudgetStatus: (
      id: string,
      status: "APPROVED" | "REJECTED",
    ): Promise<BudgetSummary> =>
      request<BudgetSummary>(baseUrl, `/budgets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        accessToken,
      }),

    /** Gera o contrato de um orçamento aprovado (§S18). */
    generateContract: (budgetId: string): Promise<{ id: string }> =>
      request<{ id: string }>(baseUrl, "/contracts", {
        method: "POST",
        body: JSON.stringify({ budgetId }),
        accessToken,
      }),

    /** Gera a cobrança (parcelas) de um orçamento aprovado (§S19). */
    createCharge: (input: {
      budgetId: string;
      method: "PIX" | "BOLETO" | "CARD";
      installments: number;
      firstDueDate: string;
    }): Promise<ChargeDetail> =>
      request<ChargeDetail>(baseUrl, "/charges", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    getCharge: (id: string): Promise<ChargeDetail> =>
      request<ChargeDetail>(baseUrl, `/charges/${id}`, { accessToken }),

    // --- Plano de tratamento + execução (§S30, gated record:read|write) ---

    generateTreatmentPlan: (budgetId: string): Promise<TreatmentPlanDetail> =>
      request<TreatmentPlanDetail>(baseUrl, "/treatment/plans", {
        method: "POST",
        body: JSON.stringify({ budgetId }),
        accessToken,
      }),

    getTreatmentPlan: (id: string): Promise<TreatmentPlanDetail> =>
      request<TreatmentPlanDetail>(baseUrl, `/treatment/plans/${id}`, {
        accessToken,
      }),

    executeTreatmentItem: (
      itemId: string,
      input: { notes?: string; performedAt?: string },
    ): Promise<TreatmentPlanDetail> =>
      request<TreatmentPlanDetail>(
        baseUrl,
        `/treatment/items/${itemId}/execute`,
        { method: "POST", body: JSON.stringify(input), accessToken },
      ),

    // --- Controle protético (§S35, gated record:read|write) ---

    listProstheticOrders: (status?: string): Promise<ProstheticOrder[]> =>
      request<ProstheticOrder[]>(
        baseUrl,
        `/prosthetic/orders${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { accessToken },
      ),

    createProstheticOrder: (input: {
      patientId: string;
      labName: string;
      description: string;
      treatmentItemId?: string;
      expectedReturnDate?: string;
      notes?: string;
    }): Promise<ProstheticOrder> =>
      request<ProstheticOrder>(baseUrl, "/prosthetic/orders", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    sendProstheticOrder: (
      id: string,
      expectedReturnDate?: string,
    ): Promise<ProstheticOrder> =>
      request<ProstheticOrder>(baseUrl, `/prosthetic/orders/${id}/send`, {
        method: "PATCH",
        body: JSON.stringify(expectedReturnDate ? { expectedReturnDate } : {}),
        accessToken,
      }),

    receiveProstheticOrder: (id: string): Promise<ProstheticOrder> =>
      request<ProstheticOrder>(baseUrl, `/prosthetic/orders/${id}/receive`, {
        method: "PATCH",
        accessToken,
      }),

    cancelProstheticOrder: (id: string): Promise<ProstheticOrder> =>
      request<ProstheticOrder>(baseUrl, `/prosthetic/orders/${id}/cancel`, {
        method: "PATCH",
        accessToken,
      }),

    // --- CRC (§S34, gated appointment:read|write) ---

    listCrcTasks: (status?: string): Promise<CrcTask[]> =>
      request<CrcTask[]>(
        baseUrl,
        `/crc/tasks${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { accessToken },
      ),

    syncCrcTasks: (): Promise<{ created: number }> =>
      request<{ created: number }>(baseUrl, "/crc/tasks/sync", {
        method: "POST",
        accessToken,
      }),

    createCrcTask: (input: {
      patientId: string;
      type: string;
      notes?: string;
    }): Promise<CrcTask> =>
      request<CrcTask>(baseUrl, "/crc/tasks", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    markCrcTaskDone: (id: string): Promise<CrcTask> =>
      request<CrcTask>(baseUrl, `/crc/tasks/${id}/done`, {
        method: "PATCH",
        accessToken,
      }),

    assignCrcTask: (id: string, userId: string | null): Promise<CrcTask> =>
      request<CrcTask>(baseUrl, `/crc/tasks/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ userId }),
        accessToken,
      }),

    // --- Engine de relatórios (§S43, gated billing:read|write) ---

    listReports: (): Promise<ReportItem[]> =>
      request<ReportItem[]>(baseUrl, "/reports", { accessToken }),

    requestReport: (input: {
      type: string;
      format: string;
      periodStart: string;
      periodEnd: string;
    }): Promise<ReportItem> =>
      request<ReportItem>(baseUrl, "/reports", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    getReport: (id: string): Promise<ReportItem> =>
      request<ReportItem>(baseUrl, `/reports/${id}`, { accessToken }),

    // --- Dashboard analítico (§S42, gated billing:read) ---

    getDashboard: (params?: {
      from?: string;
      to?: string;
    }): Promise<DashboardData> => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<DashboardData>(baseUrl, `/analytics/dashboard${suffix}`, {
        accessToken,
      });
    },

    // --- Metas (§S41, gated billing:read|write) ---

    listGoals: (): Promise<GoalProgress[]> =>
      request<GoalProgress[]>(baseUrl, "/goals", { accessToken }),

    createGoal: (input: {
      professionalId?: string;
      metric: string;
      targetValue: number;
      periodStart: string;
      periodEnd: string;
    }): Promise<GoalProgress> =>
      request<GoalProgress>(baseUrl, "/goals", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    deleteGoal: (id: string): Promise<{ id: string }> =>
      request<{ id: string }>(baseUrl, `/goals/${id}`, {
        method: "DELETE",
        accessToken,
      }),

    // --- Comissões (§S40, gated billing:read|write) ---

    listCommissionRules: (): Promise<CommissionRuleItem[]> =>
      request<CommissionRuleItem[]>(baseUrl, "/commissions/rules", {
        accessToken,
      }),

    createCommissionRule: (input: {
      professionalId: string;
      procedureId?: string;
      percent: number;
    }): Promise<CommissionRuleItem> =>
      request<CommissionRuleItem>(baseUrl, "/commissions/rules", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    recordCommission: (input: {
      professionalId: string;
      procedureId?: string;
      baseCents: number;
      description: string;
    }): Promise<CommissionEntry> =>
      request<CommissionEntry>(baseUrl, "/commissions", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    commissionReport: (params?: {
      professionalId?: string;
      from?: string;
      to?: string;
    }): Promise<CommissionReport> => {
      const qs = new URLSearchParams();
      if (params?.professionalId)
        qs.set("professionalId", params.professionalId);
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<CommissionReport>(
        baseUrl,
        `/commissions/report${suffix}`,
        { accessToken },
      );
    },

    payCommission: (id: string): Promise<CommissionEntry> =>
      request<CommissionEntry>(baseUrl, `/commissions/${id}/pay`, {
        method: "PATCH",
        accessToken,
      }),

    // --- Estoque (§S39, gated catalog:read|write) ---

    listInventoryItems: (): Promise<InventoryItem[]> =>
      request<InventoryItem[]>(baseUrl, "/inventory/items", { accessToken }),

    inventoryAlerts: (): Promise<InventoryAlerts> =>
      request<InventoryAlerts>(baseUrl, "/inventory/alerts", { accessToken }),

    createInventoryItem: (input: {
      name: string;
      unit: string;
      minQuantity?: number;
    }): Promise<InventoryItem> =>
      request<InventoryItem>(baseUrl, "/inventory/items", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    stockIn: (
      itemId: string,
      input: { quantity: number; costCents?: number; expiresAt?: string },
    ): Promise<InventoryItem> =>
      request<InventoryItem>(baseUrl, `/inventory/items/${itemId}/entrada`, {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    stockOut: (
      itemId: string,
      input: { quantity: number; reason?: string; procedureId?: string },
    ): Promise<InventoryItem> =>
      request<InventoryItem>(baseUrl, `/inventory/items/${itemId}/saida`, {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    // --- Fluxo de caixa + conciliação (§S38, gated billing:read|write) ---

    listCashFlow: (params?: {
      from?: string;
      to?: string;
    }): Promise<CashFlowEntry[]> => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<CashFlowEntry[]>(baseUrl, `/cashflow${suffix}`, {
        accessToken,
      });
    },

    cashFlowSummary: (params?: {
      from?: string;
      to?: string;
    }): Promise<CashSummary> => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<CashSummary>(baseUrl, `/cashflow/summary${suffix}`, {
        accessToken,
      });
    },

    recordCashFlow: (input: {
      direction: string;
      amountCents: number;
      date: string;
      category: string;
      description: string;
    }): Promise<CashFlowEntry> =>
      request<CashFlowEntry>(baseUrl, "/cashflow", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    syncCashFlowPayments: (): Promise<{ imported: number }> =>
      request<{ imported: number }>(baseUrl, "/cashflow/sync-payments", {
        method: "POST",
        accessToken,
      }),

    reconcileCashFlow: (
      id: string,
      reference?: string,
    ): Promise<CashFlowEntry> =>
      request<CashFlowEntry>(baseUrl, `/cashflow/${id}/reconcile`, {
        method: "PATCH",
        body: JSON.stringify(reference ? { reference } : {}),
        accessToken,
      }),

    // --- Contas a pagar/receber (§S37, gated billing:read|write) ---

    listAccounts: (params?: {
      type?: string;
      status?: string;
    }): Promise<Account[]> => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set("type", params.type);
      if (params?.status) qs.set("status", params.status);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<Account[]>(baseUrl, `/accounts${suffix}`, { accessToken });
    },

    accountsSummary: (): Promise<AccountSummary> =>
      request<AccountSummary>(baseUrl, "/accounts/summary", { accessToken }),

    createAccount: (input: {
      type: string;
      description: string;
      category: string;
      amountCents: number;
      dueDate: string;
      notes?: string;
    }): Promise<Account> =>
      request<Account>(baseUrl, "/accounts", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    payAccount: (id: string): Promise<Account> =>
      request<Account>(baseUrl, `/accounts/${id}/pay`, {
        method: "PATCH",
        accessToken,
      }),

    cancelAccount: (id: string): Promise<Account> =>
      request<Account>(baseUrl, `/accounts/${id}/cancel`, {
        method: "PATCH",
        accessToken,
      }),

    // --- Imagens intraorais (§S36, gated record:read|write) ---

    listRecordImages: (patientId: string): Promise<RecordImage[]> =>
      request<RecordImage[]>(
        baseUrl,
        `/records/${encodeURIComponent(patientId)}/images`,
        { accessToken },
      ),

    addRecordImage: (
      patientId: string,
      input: {
        filename: string;
        contentType: string;
        dataBase64: string;
        thumbnailBase64?: string;
      },
    ): Promise<RecordImage> =>
      request<RecordImage>(
        baseUrl,
        `/records/${encodeURIComponent(patientId)}/images`,
        { method: "POST", body: JSON.stringify(input), accessToken },
      ),

    // --- Documentos clínicos (§S32, gated record:read|write) ---

    listDocuments: (patientId: string): Promise<ClinicalDocumentSummary[]> =>
      request<ClinicalDocumentSummary[]>(
        baseUrl,
        `/documents?patientId=${encodeURIComponent(patientId)}`,
        { accessToken },
      ),

    issueDocument: (input: {
      patientId: string;
      type: string;
      title: string;
      content: string;
    }): Promise<ClinicalDocumentSummary> =>
      request<ClinicalDocumentSummary>(baseUrl, "/documents", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    signDocument: (id: string): Promise<ClinicalDocumentSummary> =>
      request<ClinicalDocumentSummary>(baseUrl, `/documents/${id}/sign`, {
        method: "POST",
        accessToken,
      }),

    verifyDocument: (id: string): Promise<DocumentVerification> =>
      request<DocumentVerification>(baseUrl, `/documents/${id}/verify`, {
        accessToken,
      }),

    getDocumentPdf: (id: string): Promise<{ url: string; expiresAt: string }> =>
      request<{ url: string; expiresAt: string }>(
        baseUrl,
        `/documents/${id}/pdf`,
        { accessToken },
      ),

    // --- Odontograma (§S27, gated record:read|write) ---

    getOdontogram: (patientId: string): Promise<OdontogramData> =>
      request<OdontogramData>(baseUrl, `/odontogram/${patientId}`, {
        accessToken,
      }),

    setToothCondition: (
      patientId: string,
      input: { toothNumber: number; face: string; condition: string },
    ): Promise<OdontogramData> =>
      request<OdontogramData>(baseUrl, `/odontogram/${patientId}/conditions`, {
        method: "PUT",
        body: JSON.stringify(input),
        accessToken,
      }),

    // --- Fichas por especialidade (§S29, gated record:read|write) ---

    getSpecialtyForm: (
      patientId: string,
      specialty: string,
    ): Promise<SpecialtyFormData> =>
      request<SpecialtyFormData>(
        baseUrl,
        `/specialty/${encodeURIComponent(patientId)}/${encodeURIComponent(specialty)}`,
        { accessToken },
      ),

    saveSpecialtyForm: (
      patientId: string,
      specialty: string,
      values: Record<string, unknown>,
    ): Promise<{ specialty: string; version: number }> =>
      request<{ specialty: string; version: number }>(
        baseUrl,
        `/specialty/${encodeURIComponent(patientId)}/${encodeURIComponent(specialty)}`,
        { method: "PUT", body: JSON.stringify({ values }), accessToken },
      ),

    // --- Anamnese digital (§S28) — PÚBLICO, resolvido só pelo token (sem auth) ---

    getAnamnesisForm: (token: string): Promise<AnamnesisForm> =>
      request<AnamnesisForm>(
        baseUrl,
        `/anamnesis/fill/${encodeURIComponent(token)}`,
        {},
      ),

    submitAnamnesis: (
      token: string,
      answers: Record<string, string>,
    ): Promise<AnamnesisSignResult> =>
      request<AnamnesisSignResult>(
        baseUrl,
        `/anamnesis/fill/${encodeURIComponent(token)}`,
        { method: "POST", body: JSON.stringify({ answers }) },
      ),

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

    // --- Central de acessos multi-unidade (§S45) ---

    listMyUnits: (): Promise<UnitSummary[]> =>
      request<UnitSummary[]>(baseUrl, "/network/units", { accessToken }),

    switchUnit: (unitId: string): Promise<SwitchUnitResult> =>
      request<SwitchUnitResult>(baseUrl, "/network/switch-unit", {
        method: "POST",
        body: JSON.stringify({ unitId }),
        accessToken,
      }),

    unitsRanking: (): Promise<UnitRankRow[]> =>
      request<UnitRankRow[]>(baseUrl, "/network/units/ranking", {
        accessToken,
      }),

    // --- CRM (§S44) ---

    listLeadSources: (): Promise<LeadChannelItem[]> =>
      request<LeadChannelItem[]>(baseUrl, "/crm/sources", { accessToken }),

    createLeadSource: (input: {
      name: string;
      costCents: number;
    }): Promise<LeadChannelItem> =>
      request<LeadChannelItem>(baseUrl, "/crm/sources", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    listLeads: (status?: string): Promise<CrmLeadItem[]> =>
      request<CrmLeadItem[]>(
        baseUrl,
        `/crm/leads${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { accessToken },
      ),

    createLead: (input: {
      name: string;
      phone: string;
      leadSourceId?: string;
      referredByPatientId?: string;
      birthDate?: string;
      city?: string;
    }): Promise<CrmLeadItem> =>
      request<CrmLeadItem>(baseUrl, "/crm/leads", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    updateLeadStatus: (
      id: string,
      input: { status: string; valueCents?: number },
    ): Promise<CrmLeadItem> =>
      request<CrmLeadItem>(
        baseUrl,
        `/crm/leads/${encodeURIComponent(id)}/status`,
        { method: "PATCH", body: JSON.stringify(input), accessToken },
      ),

    crmReportBySource: (): Promise<CrmSourceReport[]> =>
      request<CrmSourceReport[]>(baseUrl, "/crm/report/sources", {
        accessToken,
      }),

    crmReferrals: (): Promise<CrmReferral[]> =>
      request<CrmReferral[]>(baseUrl, "/crm/report/referrals", { accessToken }),

    crmDemographics: (): Promise<CrmDemographics> =>
      request<CrmDemographics>(baseUrl, "/crm/report/demographics", {
        accessToken,
      }),

    // ── S48: Central de Agendamentos ──────────────────────────────────────────

    centralSchedulingUnits: (): Promise<CentralUnitOption[]> =>
      request<CentralUnitOption[]>(baseUrl, "/network/scheduling/units", {
        accessToken,
      }),

    centralAppointments: (params?: {
      from?: string;
      to?: string;
      unitId?: string;
    }): Promise<CentralAppointment[]> => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      if (params?.unitId) qs.set("unitId", params.unitId);
      const q = qs.toString();
      return request<CentralAppointment[]>(
        baseUrl,
        `/network/scheduling${q ? `?${q}` : ""}`,
        { accessToken },
      );
    },

    bookCentralAppointment: (input: {
      unitId: string;
      professionalId: string;
      patientId: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
    }): Promise<CentralAppointment> =>
      request<CentralAppointment>(baseUrl, "/network/scheduling/appointments", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    /** Requisição autenticada genérica (escape hatch para recursos ainda sem método). */
    request: <T>(path: string, init?: RequestInit): Promise<T> =>
      request<T>(baseUrl, path, { ...init, accessToken }),

    // ── S49: Gestão da API pública (management endpoints — JWT) ──────────────

    createApiKey: (input: {
      name: string;
      scopes: string[];
      rateLimit?: number;
      expiresAt?: string;
    }): Promise<ApiKeyCreated> =>
      request<ApiKeyCreated>(baseUrl, "/manage/api-keys", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    listApiKeys: (): Promise<ApiKeyItem[]> =>
      request<ApiKeyItem[]>(baseUrl, "/manage/api-keys", { accessToken }),

    revokeApiKey: (id: string): Promise<void> =>
      request<void>(baseUrl, `/manage/api-keys/${id}`, {
        method: "DELETE",
        accessToken,
      }),

    getManageBranding: (): Promise<BrandingData> =>
      request<BrandingData>(baseUrl, "/manage/branding", { accessToken }),

    updateBranding: (input: {
      brandColor?: string;
      logoUrl?: string;
    }): Promise<BrandingData> =>
      request<BrandingData>(baseUrl, "/manage/branding", {
        method: "PATCH",
        body: JSON.stringify(input),
        accessToken,
      }),

    createWebhook: (input: {
      url: string;
      events: string[];
      name?: string;
    }): Promise<WebhookCreated> =>
      request<WebhookCreated>(baseUrl, "/manage/webhooks", {
        method: "POST",
        body: JSON.stringify(input),
        accessToken,
      }),

    listWebhooks: (): Promise<WebhookItem[]> =>
      request<WebhookItem[]>(baseUrl, "/manage/webhooks", { accessToken }),

    revokeWebhook: (id: string): Promise<void> =>
      request<void>(baseUrl, `/manage/webhooks/${id}`, {
        method: "DELETE",
        accessToken,
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Cliente da API pública V1 para consumidores externos (terceiros).
 * Autentica via API key (Bearer), sem JWT de sessão.
 */
export function createV1Client(baseUrl: string, apiKey: string) {
  const headers = { Authorization: `Bearer ${apiKey}` };

  return {
    appointments: (params?: {
      from?: string;
      to?: string;
    }): Promise<V1Appointment[]> => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const q = qs.toString();
      return request<V1Appointment[]>(
        baseUrl,
        `/api/v1/appointments${q ? `?${q}` : ""}`,
        { headers },
      );
    },

    patients: (q?: string): Promise<V1Patient[]> => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : "";
      return request<V1Patient[]>(baseUrl, `/api/v1/patients${qs}`, {
        headers,
      });
    },

    branding: (): Promise<BrandingData> =>
      request<BrandingData>(baseUrl, "/api/v1/branding", { headers }),
  };
}

// ── S48 types ────────────────────────────────────────────────────────────────

export interface CentralUnitOption {
  id: string;
  name: string;
}

export interface CentralAppointment {
  id: string;
  unitId: string;
  unit: { name: string };
  professionalId: string;
  professional: { name: string };
  patientId: string;
  patient: { name: string; phone: string };
  startsAt: string;
  endsAt: string;
  status: string;
  markers: string[];
  notes: string | null;
}

// ── S49 types ────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** Retorno do `createApiKey`: inclui o plain key retornado UMA única vez. */
export interface ApiKeyCreated extends ApiKeyItem {
  key: string;
}

export interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

/** Retorno do `createWebhook`: inclui o signing secret retornado UMA única vez. */
export interface WebhookCreated extends WebhookItem {
  secret: string;
}

export interface BrandingData {
  name: string;
  brandColor: string | null;
  logoUrl: string | null;
}

export interface V1Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  unitId: string;
  professionalId: string;
  patientId: string;
}

export interface V1Patient {
  id: string;
  name: string;
  phone: string;
  leadSource: string;
  createdAt: string;
}
