import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import type { IncomingMessage } from "node:http";
import { AppointmentModule } from "./appointment/appointment.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./common/audit/audit.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { TenantGuard } from "./common/guards/tenant.guard";
import { validateEnv, type Env } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { PatientModule } from "./patient/patient.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // Logging estruturado JSON com trace id por request (CLAUDE.md §4).
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isProd = config.get("NODE_ENV", { infer: true }) === "production";
        return {
          pinoHttp: {
            level: isProd ? "info" : "debug",
            // trace id: usa header recebido ou gera um novo.
            genReqId: (req: IncomingMessage) =>
              (req.headers["x-request-id"] as string) ?? randomUUID(),
            // Nunca logar segredos/PII.
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                'req.headers["set-cookie"]',
                "res.headers['set-cookie']",
              ],
              remove: true,
            },
            // JSON puro em produção; pretty no desenvolvimento (chave omitida em prod).
            ...(isProd
              ? {}
              : {
                  transport: {
                    target: "pino-pretty",
                    options: { singleLine: true },
                  },
                }),
          },
        };
      },
    }),

    // Rate limit global (CLAUDE.md §4/§12 — 100 req / 15 min nos públicos).
    ThrottlerModule.forRoot([
      { name: "global", ttl: 15 * 60 * 1000, limit: 100 },
    ]),

    PrismaModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    PatientModule,
    AppointmentModule,
  ],
  providers: [
    // Ordem importa: rate limit → autenticação → tenant → autorização (deny-by-default).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
