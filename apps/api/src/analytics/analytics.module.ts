import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

/**
 * Analytics (S42): dashboard de indicadores agregados com cache Redis. Tenant-scoped.
 * PrismaService e RedisService são @Global.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class AnalyticsModule {}
