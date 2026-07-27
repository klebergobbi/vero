import { Module } from "@nestjs/common";
import { AppointmentModule } from "../appointment/appointment.module";
import { DashboardService } from "../analytics/dashboard.service";
import { CrmService } from "../crm/crm.service";
import { AnthropicService } from "../integrations/anthropic/anthropic.service";
import { MeModule } from "../me/me.module";
import { OrgModule } from "../org/org.module";
import { AgentService } from "./agent.service";
import { InsightsController } from "./insights.controller";
import { InsightsService } from "./insights.service";

@Module({
  imports: [AppointmentModule, OrgModule, MeModule],
  controllers: [InsightsController],
  // AnthropicService/DashboardService/CrmService providos aqui (stateless —
  // só dependem de Prisma/Redis, ambos @Global), mesmo padrão da S28/S29:
  // evita importar os módulos donos inteiros (AnalyticsModule/CrmModule) só
  // pelo service.
  providers: [
    AgentService,
    InsightsService,
    AnthropicService,
    DashboardService,
    CrmService,
  ],
  exports: [AgentService, InsightsService],
})
export class AiModule {}
