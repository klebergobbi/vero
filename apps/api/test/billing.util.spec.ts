import { monthlyDueDates, splitCents } from "../src/billing/billing.util";

describe("billing.util (S19)", () => {
  it("splitCents: soma EXATA, resto distribuído nas primeiras", () => {
    expect(splitCents(10001, 3)).toEqual([3334, 3334, 3333]);
    expect(splitCents(10001, 3).reduce((a, b) => a + b, 0)).toBe(10001);
    expect(splitCents(10000, 4)).toEqual([2500, 2500, 2500, 2500]);
    expect(splitCents(100, 3)).toEqual([34, 33, 33]);
  });

  it("splitCents: 1 parcela = total", () => {
    expect(splitCents(29000, 1)).toEqual([29000]);
  });

  it("monthlyDueDates: vencimentos mensais a partir da primeira", () => {
    expect(monthlyDueDates("2026-07-10", 3)).toEqual([
      "2026-07-10",
      "2026-08-10",
      "2026-09-10",
    ]);
  });

  it("monthlyDueDates: vira o ano", () => {
    expect(monthlyDueDates("2026-12-05", 2)).toEqual([
      "2026-12-05",
      "2027-01-05",
    ]);
  });
});
