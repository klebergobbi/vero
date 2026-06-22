import {
  dueDateRangeForStep,
  parseSteps,
  renderTemplate,
} from "../src/collection/collection.util";

describe("collection.util (S22)", () => {
  it("dueDateRangeForStep: D-3 → vencimento = hoje + 3", () => {
    const now = new Date("2026-07-10T15:00:00Z");
    const r = dueDateRangeForStep(now, -3);
    expect(r.gte.toISOString()).toBe("2026-07-13T00:00:00.000Z");
    expect(r.lt.toISOString()).toBe("2026-07-14T00:00:00.000Z");
  });

  it("dueDateRangeForStep: D0 → vencimento = hoje", () => {
    const r = dueDateRangeForStep(new Date("2026-07-10T23:30:00Z"), 0);
    expect(r.gte.toISOString()).toBe("2026-07-10T00:00:00.000Z");
  });

  it("dueDateRangeForStep: D+5 → vencimento = hoje − 5", () => {
    const r = dueDateRangeForStep(new Date("2026-07-10T00:00:00Z"), 5);
    expect(r.gte.toISOString()).toBe("2026-07-05T00:00:00.000Z");
  });

  it("parseSteps descarta entradas malformadas", () => {
    expect(
      parseSteps([
        { offsetDays: -3, template: "ok" },
        { offsetDays: "x", template: "bad" },
        { template: "sem offset" },
        null,
      ]),
    ).toEqual([{ offsetDays: -3, template: "ok" }]);
  });

  it("renderTemplate substitui {nome}", () => {
    expect(renderTemplate("Olá {nome}!", { nome: "Ana" })).toBe("Olá Ana!");
  });
});
