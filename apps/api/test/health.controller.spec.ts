import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../src/health/health.controller";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { RedisService } from "../src/redis/redis.service";

describe("HealthController", () => {
  function build(opts: { dbOk: boolean; redisOk: boolean }) {
    const prisma = {
      $queryRaw: jest.fn(() =>
        opts.dbOk
          ? Promise.resolve([{ "?column?": 1 }])
          : Promise.reject(new Error("db down")),
      ),
    } as unknown as PrismaService;

    const redis = {
      ping: jest.fn(() =>
        opts.redisOk
          ? Promise.resolve("PONG")
          : Promise.reject(new Error("redis down")),
      ),
    } as unknown as RedisService;

    return new HealthController(prisma, redis);
  }

  it("retorna status ok quando banco e redis estão de pé", async () => {
    const controller = build({ dbOk: true, redisOk: true });
    const result = await controller.check();
    expect(result).toEqual({
      status: "ok",
      info: { database: "up", redis: "up" },
    });
  });

  it("lança 503 (fail-closed) quando o banco está fora", async () => {
    const controller = build({ dbOk: false, redisOk: true });
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("lança 503 quando o redis está fora", async () => {
    const controller = build({ dbOk: true, redisOk: false });
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
