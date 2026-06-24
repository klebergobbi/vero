/** Converte "YYYY-MM" no intervalo [primeiro, último dia] em ISO (UTC). */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y!, m! - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(y!, m!, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}
