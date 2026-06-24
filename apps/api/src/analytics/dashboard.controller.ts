import { Controller, Get, Post, Query } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { DashboardService } from "./dashboard.service";

/** Dashboard analítico (S42) — gestão (billing:read|write). */
@Controller("analytics/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** GET /analytics/dashboard?from=&to= — indicadores agregados (via cache). */
  @Get()
  @Permissions("billing:read")
  get(
    @TenantId() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.dashboard.getDashboard(tenantId, {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  /** POST /analytics/dashboard/invalidate — limpa o cache (gancho de evento). */
  @Post("invalidate")
  @Permissions("billing:write")
  invalidate(@TenantId() tenantId: string) {
    return this.dashboard.invalidate(tenantId);
  }
}
