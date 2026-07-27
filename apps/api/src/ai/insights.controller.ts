import { Controller, Get, Post, Query } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { InsightsService } from "./insights.service";

/** Insights via IA (S51) — sugestões acionáveis a partir de dados agregados (billing:read|write). */
@Controller("ai/insights")
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  @Permissions("billing:read")
  get(
    @TenantId() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.insights.generate(tenantId, {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  @Post("invalidate")
  @Permissions("billing:write")
  invalidate(@TenantId() tenantId: string) {
    return this.insights.invalidate(tenantId);
  }
}
