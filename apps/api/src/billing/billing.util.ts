/** Utilidades puras de cobrança (§S19) — valores SEMPRE calculados no servidor. */

/**
 * Divide um total (centavos) em N parcelas inteiras cuja soma é EXATA. O resto
 * (centavos) é distribuído 1 a 1 nas primeiras parcelas. Ex.: 10001 em 3 →
 * [3334, 3334, 3333] (soma 10001).
 */
export function splitCents(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** N datas de vencimento mensais (YYYY-MM-DD) a partir da primeira. */
export function monthlyDueDates(firstDueDate: string, n: number): string[] {
  const [y, m, d] = firstDueDate.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + i, d ?? 1));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}
