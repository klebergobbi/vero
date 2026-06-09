import { z } from "zod";

/**
 * Catálogo de PERMISSIONS — fonte única (CLAUDE.md §2: schemas em packages/types,
 * reusados nos 4 apps; nunca duplicar tipos à mão). O seed (apps/api/prisma/seed.ts)
 * popula a tabela Permission a partir desta lista; os guards da S4 (deny-by-default)
 * validam permission keys contra ela.
 *
 * Convenção de chave: `recurso:ação`. Mantemos um conjunto enxuto que cobre os
 * bounded contexts já existentes/próximos (Org/Acesso, Paciente, Agenda, Clínico,
 * Comercial, Financeiro, Analytics) — §6. Novas keys são adicionadas aqui.
 */
export const PERMISSIONS = [
  // Org/Acesso
  { key: "user:read", description: "Visualizar usuários" },
  { key: "user:write", description: "Criar/editar usuários" },
  { key: "role:read", description: "Visualizar papéis e permissões" },
  { key: "role:write", description: "Criar/editar papéis e permissões" },
  { key: "audit:read", description: "Consultar logs de auditoria" },
  // Paciente
  { key: "patient:read", description: "Visualizar pacientes" },
  { key: "patient:write", description: "Criar/editar pacientes" },
  { key: "patient:delete", description: "Remover (soft-delete) pacientes" },
  // Agenda
  { key: "appointment:read", description: "Visualizar agenda" },
  { key: "appointment:write", description: "Criar/mover agendamentos" },
  { key: "appointment:cancel", description: "Cancelar agendamentos" },
  // Clínico
  { key: "record:read", description: "Visualizar prontuário" },
  { key: "record:write", description: "Editar prontuário" },
  // Comercial
  { key: "budget:read", description: "Visualizar orçamentos" },
  { key: "budget:write", description: "Criar/editar orçamentos" },
  // Financeiro
  { key: "billing:read", description: "Visualizar cobranças e pagamentos" },
  { key: "billing:write", description: "Gerar/editar cobranças" },
  // Analytics
  { key: "dashboard:read", description: "Visualizar indicadores" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as [
  PermissionKey,
  ...PermissionKey[],
];

/** Valida que uma string é uma permission key conhecida (3 camadas — §2). */
export const permissionKeySchema = z.enum(PERMISSION_KEYS);

/**
 * Papéis de sistema (CLAUDE.md S2). `key` é string no banco (Role.key) para permitir
 * papéis customizados no futuro sem migration de enum; estes quatro são marcados
 * `isSystem` no seed. O mapeamento papel→permissions abaixo é a fonte única.
 */
export const SYSTEM_ROLE_KEYS = [
  "GESTOR",
  "DENTISTA",
  "RECEPCAO",
  "FINANCEIRO",
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export const systemRoleKeySchema = z.enum(SYSTEM_ROLE_KEYS);

const ALL_PERMISSIONS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

/** Definição dos papéis de sistema com nome amigável e permissions concedidas. */
export const SYSTEM_ROLES: ReadonlyArray<{
  key: SystemRoleKey;
  name: string;
  permissions: PermissionKey[];
}> = [
  {
    key: "GESTOR",
    name: "Gestor",
    // Acesso total — administra a clínica.
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "DENTISTA",
    name: "Dentista",
    permissions: [
      "patient:read",
      "appointment:read",
      "appointment:write",
      "record:read",
      "record:write",
      "budget:read",
    ],
  },
  {
    key: "RECEPCAO",
    name: "Recepção",
    permissions: [
      "patient:read",
      "patient:write",
      "appointment:read",
      "appointment:write",
      "appointment:cancel",
      "billing:read",
    ],
  },
  {
    key: "FINANCEIRO",
    name: "Financeiro",
    permissions: [
      "patient:read",
      "billing:read",
      "billing:write",
      "budget:read",
      "dashboard:read",
    ],
  },
];

/**
 * Ações registradas no AuditLog (CLAUDE.md §4 — observabilidade A09). Espelha o
 * enum `AuditAction` do schema.prisma (o Prisma exige o enum no DSL; esta é a
 * versão Zod/TS reusável no front). NUNCA registrar PII no log, apenas ids/ação.
 */
export const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "AUTHZ_DENIED",
  "SENSITIVE_READ",
  "PERMISSION_CHANGED",
  "ACCOUNT_DELETED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
