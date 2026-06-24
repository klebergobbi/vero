import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { CreateGoalDto } from "./dto/goal.dto";
import { GoalService } from "./goal.service";

/** Metas (S41) — gestão (billing:read|write). */
@Controller("goals")
export class GoalController {
  constructor(private readonly goals: GoalService) {}

  /** POST /goals — define uma meta por clínica/profissional e período. */
  @Post()
  @Permissions("billing:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateGoalDto) {
    return this.goals.create(tenantId, {
      ...(dto.professionalId ? { professionalId: dto.professionalId } : {}),
      metric: dto.metric,
      targetValue: dto.targetValue,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });
  }

  /** GET /goals — metas com progresso (meta vs realizado). */
  @Get()
  @Permissions("billing:read")
  list(@TenantId() tenantId: string) {
    return this.goals.listWithProgress(tenantId);
  }

  /** DELETE /goals/:id — remove a meta. */
  @Delete(":id")
  @Permissions("billing:write")
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.goals.remove(tenantId, id);
  }
}
