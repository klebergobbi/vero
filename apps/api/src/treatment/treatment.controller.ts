import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { ExecuteItemDto, GeneratePlanDto } from "./dto/treatment.dto";
import { TreatmentService } from "./treatment.service";

/** Plano de tratamento + execução (S30) — equipe clínica (record:read|write). */
@Controller("treatment")
export class TreatmentController {
  constructor(private readonly treatment: TreatmentService) {}

  /** POST /treatment/plans — gera o plano a partir de um orçamento aprovado. */
  @Post("plans")
  @Permissions("record:write")
  generate(@TenantId() tenantId: string, @Body() dto: GeneratePlanDto) {
    return this.treatment.generateFromBudget(tenantId, dto.budgetId);
  }

  @Get("plans")
  @Permissions("record:read")
  list(@TenantId() tenantId: string, @Query("patientId") patientId?: string) {
    return this.treatment.listPlans(tenantId, patientId);
  }

  @Get("plans/:id")
  @Permissions("record:read")
  get(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.treatment.getPlan(tenantId, id);
  }

  /** POST /treatment/items/:id/execute — registra uma sessão executada. */
  @Post("items/:id/execute")
  @Permissions("record:write")
  execute(
    @TenantId() tenantId: string,
    @Param("id") itemId: string,
    @CurrentPrincipal() principal: Principal,
    @Body() dto: ExecuteItemDto,
  ) {
    const performedById = principal.kind === "staff" ? principal.userId : "";
    return this.treatment.executeItem(tenantId, itemId, performedById, {
      ...(dto.notes ? { notes: dto.notes } : {}),
      ...(dto.performedAt ? { performedAt: dto.performedAt } : {}),
    });
  }
}
