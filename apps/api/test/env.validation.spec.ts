import { validateEnv } from "../src/config/env.validation";

const validConfig = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/vero",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "x".repeat(32),
  CORS_ORIGINS: "http://localhost:3000",
};

describe("validateEnv", () => {
  it("aceita configuração válida e aplica defaults (PORT)", () => {
    const env = validateEnv(validConfig);
    expect(env.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    expect(env.PORT).toBe(3333);
    expect(env.NODE_ENV).toBe("test");
  });

  it("aborta com mensagem clara quando falta env obrigatória", () => {
    const { DATABASE_URL: _omit, ...semDatabase } = validConfig;
    expect(() => validateEnv(semDatabase)).toThrow(/DATABASE_URL/);
    expect(() => validateEnv(semDatabase)).toThrow(/inválida/i);
  });

  it("rejeita JWT_SECRET curto (< 32 caracteres)", () => {
    expect(() => validateEnv({ ...validConfig, JWT_SECRET: "curto" })).toThrow(
      /JWT_SECRET/,
    );
  });

  it("rejeita URL de banco inválida", () => {
    expect(() =>
      validateEnv({ ...validConfig, DATABASE_URL: "não-é-url" }),
    ).toThrow(/DATABASE_URL/);
  });
});

// teste temporário S52: prova que o CI bloqueia teste quebrado + segredo
describe("S52 gate check (temporário)", () => {
  it("falha de propósito", () => {
    expect(1).toBe(2);
  });
});
