/** Utilidades puras da régua de cobrança (§S22). */

export interface CollectionStep {
  /** dias relativos ao vencimento: <0 antes (D-3), 0 no venc, >0 após (D+X). */
  offsetDays: number;
  template: string;
}

/** Lê/valida as etapas do JSON da régua (descarta entradas malformadas). */
export function parseSteps(raw: unknown): CollectionStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is CollectionStep =>
      !!s &&
      typeof (s as CollectionStep).offsetDays === "number" &&
      typeof (s as CollectionStep).template === "string",
  );
}

export function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/**
 * Janela [gte, lt) do dia de vencimento ALVO de uma etapa, dado "hoje". A etapa
 * dispara quando o vencimento = hoje − offsetDays (ex.: D-3 dispara quando faltam
 * 3 dias → vencimento = hoje + 3).
 */
export function dueDateRangeForStep(
  now: Date,
  offsetDays: number,
): { gte: Date; lt: Date } {
  const target = addDays(startOfUtcDay(now), -offsetDays);
  return { gte: target, lt: addDays(target, 1) };
}

/** Substitui {chave} pelo valor (template simples). */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}
