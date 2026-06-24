import { Module } from "@nestjs/common";
import { GoalController } from "./goal.controller";
import { GoalService } from "./goal.service";

/**
 * Metas (S41): alvo por clínica/profissional e período, com acompanhamento do
 * realizado (calculado dos dados). Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [GoalController],
  providers: [GoalService],
})
export class GoalModule {}
