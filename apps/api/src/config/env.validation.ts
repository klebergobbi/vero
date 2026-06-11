import { z } from "zod";

/**
 * Schema das variáveis de ambiente obrigatórias (CLAUDE.md §4 — config segura,
 * sem defaults perigosos). A aplicação NÃO sobe se algo estiver inválido/ausente.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3333),
  DATABASE_URL: z.string().url("DATABASE_URL deve ser uma URL válida"),
  REDIS_URL: z.string().url("REDIS_URL deve ser uma URL válida"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter ao menos 32 caracteres"),
  // Lista separada por vírgula de origens permitidas no CORS (nunca "*" com credenciais).
  CORS_ORIGINS: z.string().min(1, "CORS_ORIGINS é obrigatório"),

  // Integração WhatsApp (Evolution API) — segredos SÓ no backend (CLAUDE.md §7).
  // Opcionais: a API sobe sem elas, mas qualquer envo falha fechado (ServiceUnavailable)
  // até estarem configuradas. EVOLUTION_API_URL nunca recebe input do usuário (anti-SSRF).
  EVOLUTION_API_URL: z
    .string()
    .url("EVOLUTION_API_URL deve ser uma URL válida")
    .optional(),
  EVOLUTION_API_KEY: z.string().min(1).optional(),
  EVOLUTION_INSTANCE: z.string().min(1).optional(),
  // Segredo que o webhook da Evolution deve apresentar (header/query) — valida a
  // origem (S12b). Sem ele, o webhook recusa tudo (fail-closed).
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Usado pelo ConfigModule.forRoot({ validate }). Lança erro com mensagem clara
 * (lista todos os problemas) e aborta a inicialização — fail-closed.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => {
        const path = issue.path.join(".") || "(raiz)";
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `Configuração de ambiente inválida. Corrija o .env e tente novamente:\n${issues}`,
    );
  }

  return parsed.data;
}
