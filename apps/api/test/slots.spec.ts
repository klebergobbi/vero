import {
  computeOpenSlots,
  wallTimeToUtc,
} from "../src/appointment/agenda.util";

describe("computeOpenSlots (S15)", () => {
  const TZ = "America/Sao_Paulo";
  const base = {
    year: 2026,
    month: 7,
    day: 1,
    timeZone: TZ,
    slotMinutes: 30,
    minLeadMs: 60 * 60 * 1000,
    now: new Date("2026-06-01T00:00:00Z"), // bem antes do dia
  };

  it("converte 14:00 SP em 17:00Z (wallTimeToUtc)", () => {
    expect(wallTimeToUtc(2026, 7, 1, 14 * 60, TZ).toISOString()).toBe(
      "2026-07-01T17:00:00.000Z",
    );
  });

  it("fatia a janela 09:00–11:00 em 4 slots de 30min", () => {
    const slots = computeOpenSlots({
      ...base,
      windows: [{ startMinute: 9 * 60, endMinute: 11 * 60 }],
      busy: [],
    });
    expect(slots.map((s) => s.start)).toEqual([
      wallTimeToUtc(2026, 7, 1, 9 * 60, TZ).toISOString(),
      wallTimeToUtc(2026, 7, 1, 9 * 60 + 30, TZ).toISOString(),
      wallTimeToUtc(2026, 7, 1, 10 * 60, TZ).toISOString(),
      wallTimeToUtc(2026, 7, 1, 10 * 60 + 30, TZ).toISOString(),
    ]);
  });

  it("remove o slot que colide com um agendamento existente", () => {
    const busyStart = wallTimeToUtc(2026, 7, 1, 9 * 60 + 30, TZ);
    const busyEnd = wallTimeToUtc(2026, 7, 1, 10 * 60, TZ);
    const slots = computeOpenSlots({
      ...base,
      windows: [{ startMinute: 9 * 60, endMinute: 11 * 60 }],
      busy: [{ start: busyStart, end: busyEnd }],
    });
    const starts = slots.map((s) => s.start);
    expect(starts).not.toContain(busyStart.toISOString());
    expect(starts).toHaveLength(3);
  });

  it("exclui slots antes da antecedência mínima (now + lead)", () => {
    const slots = computeOpenSlots({
      ...base,
      now: new Date("2026-07-01T13:00:00Z"), // earliest = 14:00Z
      windows: [{ startMinute: 9 * 60, endMinute: 11 * 60 }], // 12:00–13:30Z
      busy: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("janela vazia → nenhum slot", () => {
    expect(computeOpenSlots({ ...base, windows: [], busy: [] })).toHaveLength(
      0,
    );
  });
});
