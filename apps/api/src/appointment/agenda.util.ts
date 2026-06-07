/** Utilidades puras da agenda (testáveis isoladamente). */

/** Dois intervalos [aStart,aEnd) e [bStart,bEnd) se sobrepõem? */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Dia da semana (0=domingo) e minuto do dia (0–1439) de um instante UTC NO FUSO
 * informado (timezone da unidade). Usa Intl — sem dependência externa.
 */
export function localDayAndMinute(
  date: Date,
  timeZone: string,
): { dayOfWeek: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  let weekday = "Sun";
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "weekday") weekday = part.value;
    else if (part.type === "hour")
      hour = Number(part.value) % 24; // "24" → 0
    else if (part.type === "minute") minute = Number(part.value);
  }

  return { dayOfWeek: WEEKDAY_INDEX[weekday] ?? 0, minute: hour * 60 + minute };
}
