import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { Env } from "../config/env.validation";

/**
 * Cliente Redis (sessões/refresh-token revogável virão na S3). Estende ioredis
 * e fecha a conexão no shutdown (CLAUDE.md §4 — graceful shutdown).
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService<Env, true>) {
    super(config.get("REDIS_URL", { infer: true }), {
      // Falha rápido em vez de enfileirar comandos indefinidamente (fail-closed).
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });

    this.on("error", (err) => {
      this.logger.error(`Erro no Redis: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
