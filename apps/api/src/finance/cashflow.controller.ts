import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { CashFlowService } from "./cashflow.service";
import { RecordCashFlowDto, ReconcileCashFlowDto } from "./dto/cashflow.dto";

/** Fluxo de caixa + conciliação (S38) — financeiro (billing:read|write). */
@Controller("cashflow")
export class CashFlowController {
  constructor(private readonly cashflow: CashFlowService) {}

  /** POST /cashflow — lança um movimento de caixa manual. */
  @Post()
  @Permissions("billing:write")
  record(@TenantId() tenantId: string, @Body() dto: RecordCashFlowDto) {
    return this.cashflow.record(tenantId, {
      direction: dto.direction,
      amountCents: dto.amountCents,
      date: dto.date,
      category: dto.category,
      description: dto.description,
    });
  }

  /** POST /cashflow/sync-payments — conciliação AUTO (importa pagamentos da S20). */
  @Post("sync-payments")
  @Permissions("billing:write")
  sync(@TenantId() tenantId: string) {
    return this.cashflow.syncPayments(tenantId);
  }

  /** GET /cashflow?from=&to= — movimentos do período (diário/mensal). */
  @Get()
  @Permissions("billing:read")
  list(
    @TenantId() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.cashflow.list(tenantId, {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  /** GET /cashflow/summary?from=&to= — entradas/saídas/saldo do período. */
  @Get("summary")
  @Permissions("billing:read")
  summary(
    @TenantId() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.cashflow.summary(tenantId, {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  /** PATCH /cashflow/:id/reconcile — conciliação MANUAL. */
  @Patch(":id/reconcile")
  @Permissions("billing:write")
  reconcile(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: ReconcileCashFlowDto,
  ) {
    return this.cashflow.reconcile(tenantId, id, {
      ...(dto.reference ? { reference: dto.reference } : {}),
    });
  }
}
