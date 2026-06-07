import { z } from "zod";

/**
 * Origem do lead (CLAUDE.md §6 — Patient.origem). Espelha o enum `LeadSource`
 * do schema.prisma (manter em sincronia). Fonte única reusada nos 4 apps.
 */
export const LEAD_SOURCES = [
  "INDICACAO_PACIENTE",
  "INDICACAO_PROFISSIONAL",
  "INSTAGRAM",
  "FACEBOOK",
  "GOOGLE",
  "WHATSAPP",
  "SITE",
  "OUTROS",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];
export const leadSourceSchema = z.enum(LEAD_SOURCES);

/** Remove tudo que não for dígito (normaliza CPF/telefone para armazenar/validar). */
export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validação de CPF (dígitos verificadores). Aceita com ou sem máscara.
 * Reusada no form (Zod) e no DTO (class-validator) — validação em 3 camadas (§2).
 */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const digit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/**
 * Telefone brasileiro: 10 (fixo) ou 11 (celular) dígitos, DDD 11–99,
 * celular começa com 9. Aceita com ou sem máscara.
 */
export function isValidBrazilianPhone(value: string): boolean {
  const phone = normalizeDigits(value);
  if (phone.length !== 10 && phone.length !== 11) return false;
  const ddd = Number(phone.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (phone.length === 11 && phone[2] !== "9") return false;
  return true;
}

export const cpfSchema = z
  .string()
  .refine(isValidCpf, { message: "CPF inválido" });
export const brazilianPhoneSchema = z
  .string()
  .refine(isValidBrazilianPhone, { message: "Telefone inválido" });
