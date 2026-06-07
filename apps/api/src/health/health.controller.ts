import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

type DependencyStatus = "up" | "down";

interface HealthResult {
  status: "ok" | "error";
  info: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
}

@Public()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * GET /health — checa PostgreSQL e Redis.
   * Sem rate limit (monitoramento). 200 se tudo ok; 503 (fail-closed) se algo cair.
   */
  @Get()
  @SkipThrottle()
  async check(): Promise<HealthResult> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const result: HealthResult = {
      status: database === "up" && redis === "up" ? "ok" : "error",
      info: { database, redis },
    };

    if (result.status === "error") {
      // Payload não-sensível: expõe apenas qual dependência está fora.
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "up";
    } catch (err) {
      this.logger.error(
        `Healthcheck do banco falhou: ${(err as Error).message}`,
      );
      return "down";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === "PONG" ? "up" : "down";
    } catch (err) {
      this.logger.error(
        `Healthcheck do Redis falhou: ${(err as Error).message}`,
      );
      return "down";
    }
  }
}
