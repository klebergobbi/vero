import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import type { Env } from "./config/env.validation";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger JSON (nestjs-pino) como logger oficial do Nest.
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Env, true>);
  const isProd = config.get("NODE_ENV", { infer: true }) === "production";

  // Headers de segurança: CSP, HSTS, X-Content-Type-Options, X-Frame-Options.
  app.use(helmet());

  // CORS por allowlist (nunca "*" com credenciais — CLAUDE.md §4).
  const corsOrigins = config
    .get("CORS_ORIGINS", { infer: true })
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Validação global de DTOs (rejeita 400; whitelist remove campos não declarados).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Graceful shutdown (fecha Prisma/Redis via OnModuleDestroy).
  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port);

  if (!isProd) {
    app.get(Logger).log(`API ouvindo em http://localhost:${port}`, "Bootstrap");
  }
}

void bootstrap();
