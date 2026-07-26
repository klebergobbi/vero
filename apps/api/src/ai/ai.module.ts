import { Module } from "@nestjs/common";
import { AppointmentModule } from "../appointment/appointment.module";
import { AnthropicService } from "../integrations/anthropic/anthropic.service";
import { MeModule } from "../me/me.module";
import { OrgModule } from "../org/org.module";
import { AgentService } from "./agent.service";

@Module({
  imports: [AppointmentModule, OrgModule, MeModule],
  // AnthropicService provido aqui (stateless, mesmo padrão da S28/S29): proxy
  // fino da Claude Messages API, sem acoplar a um módulo de integrações maior.
  providers: [AgentService, AnthropicService],
  exports: [AgentService],
})
export class AiModule {}
