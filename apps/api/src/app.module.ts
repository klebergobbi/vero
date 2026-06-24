import { randomUUID } from "node:crypto";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import type { IncomingMessage } from "node:http";
import { WhatsAppModule } from "./integrations/whatsapp/whatsapp.module";
import { PushModule } from "./push/push.module";

/**
 * Converte a REDIS_URL em opções de conexão do BullMQ. Passamos opções (não uma
 * instância ioredis) p/ o BullMQ criar seu próprio cliente — evita o clash de tipos
 * entre versões de ioredis na árvore. maxRetriesPerRequest:null é exigência do BullMQ.
 */
function bullConnection(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    maxRetriesPerRequest: null,
    ...(u.username ? { username: u.username } : {}),
    ...(u.password ? { password: u.password } : {}),
    ...(u.pathname.length > 1 ? { db: Number(u.pathname.slice(1)) } : {}),
    ...(u.protocol === "rediss:" ? { tls: {} } : {}),
  };
}
import { AppointmentModule } from "./appointment/appointment.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./common/audit/audit.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { TenantGuard } from "./common/guards/tenant.guard";
import { validateEnv, type Env } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { BillingModule } from "./billing/billing.module";
import { BudgetModule } from "./budget/budget.module";
import { CollectionModule } from "./collection/collection.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ContractModule } from "./contract/contract.module";
import { CreditModule } from "./credit/credit.module";
import { AlignerModule } from "./aligner/aligner.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnamnesisModule } from "./anamnesis/anamnesis.module";
import { CommissionModule } from "./commission/commission.module";
import { CrcModule } from "./crc/crc.module";
import { DocumentModule } from "./document/document.module";
import { FinanceModule } from "./finance/finance.module";
import { GoalModule } from "./goal/goal.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ProstheticModule } from "./prosthetic/prosthetic.module";
import { ReportModule } from "./reports/report.module";
import { ReturnModule } from "./return/return.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { SpecialtyModule } from "./specialty/specialty.module";
import { TreatmentModule } from "./treatment/treatment.module";
import { MeModule } from "./me/me.module";
import { OdontogramModule } from "./odontogram/odontogram.module";
import { OrgModule } from "./org/org.module";
import { PatientModule } from "./patient/patient.module";
import { PublicModule } from "./public/public.module";
import { ReceiptModule } from "./receipt/receipt.module";
import { RecordModule } from "./record/record.module";
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

    // Filas BullMQ (CLAUDE.md §7). Conexão própria ao Redis com
    // maxRetriesPerRequest:null (exigência do BullMQ p/ comandos bloqueantes do
    // worker). defaultJobOptions impõe idempotência-amigável + retry/backoff/DLQ.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: bullConnection(config.get("REDIS_URL", { infer: true })),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: 1000,
          removeOnFail: false,
        },
      }),
    }),

    PrismaModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    PatientModule,
    AppointmentModule,
    OrgModule,
    PublicModule,
    CatalogModule,
    BudgetModule,
    ContractModule,
    BillingModule,
    CollectionModule,
    InvoiceModule,
    ReceiptModule,
    CreditModule,
    RecordModule,
    OdontogramModule,
    AnamnesisModule,
    SpecialtyModule,
    TreatmentModule,
    AlignerModule,
    DocumentModule,
    ReturnModule,
    CrcModule,
    ProstheticModule,
    FinanceModule,
    InventoryModule,
    CommissionModule,
    GoalModule,
    AnalyticsModule,
    ReportModule,
    MeModule,
    WhatsAppModule,
    PushModule,
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
