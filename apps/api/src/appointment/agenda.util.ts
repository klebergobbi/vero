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

/**
 * Offset do fuso (em minutos) no instante `date`. Usa Intl (sem dep). Para
 * America/Sao_Paulo (sem horário de verão desde 2019) é estável (-180).
 */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts)
    if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUtc = Date.UTC(
    map.year ?? 1970,
    (map.month ?? 1) - 1,
    map.day ?? 1,
    (map.hour ?? 0) % 24,
    map.minute ?? 0,
    map.second ?? 0,
  );
  return (asUtc - date.getTime()) / 60000;
}

/**
 * Instante UTC de um "wall-clock" (data civil + minuto do dia) NO FUSO dado —
 * inverso de `localDayAndMinute`. Ex.: 14:00 em America/Sao_Paulo → 17:00Z.
 */
export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(
    year,
    month - 1,
    day,
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
  );
  const offset = tzOffsetMinutes(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offset * 60000);
}

export interface SlotWindow {
  startMinute: number;
  endMinute: number;
}
export interface BusyInterval {
  start: Date;
  end: Date;
}
export interface OpenSlot {
  start: string;
  end: string;
}

/**
 * Calcula os slots LIVRES de um dia (puro/testável): fatia as janelas de
 * disponibilidade em blocos de `slotMinutes`, descarta os que começam antes de
 * `now + minLeadMs` (antecedência mínima) e os que colidem com `busy`
 * (agendamentos existentes). Devolve instantes ISO, ordenados.
 */
export function computeOpenSlots(params: {
  windows: SlotWindow[];
  busy: BusyInterval[];
  year: number;
  month: number;
  day: number;
  timeZone: string;
  slotMinutes: number;
  minLeadMs: number;
  now: Date;
}): OpenSlot[] {
  const { windows, busy, year, month, day, timeZone, slotMinutes } = params;
  const earliest = new Date(params.now.getTime() + params.minLeadMs);
  const out: OpenSlot[] = [];
  for (const w of windows) {
    for (
      let m = w.startMinute;
      m + slotMinutes <= w.endMinute;
      m += slotMinutes
    ) {
      const start = wallTimeToUtc(year, month, day, m, timeZone);
      const end = new Date(start.getTime() + slotMinutes * 60000);
      if (start < earliest) continue;
      if (busy.some((b) => overlaps(start, end, b.start, b.end))) continue;
      out.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : 1));
}
