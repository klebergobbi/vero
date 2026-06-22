import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { BillingService } from "./billing.service";
import { CreateChargeDto } from "./dto/billing.dto";

/** Cobranças (S19) — tenant-scoped + deny-by-default (billing:read|write). */
@Controller("charges")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  @Permissions("billing:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateChargeDto) {
    return this.billing.createCharge(tenantId, dto);
  }

  @Get()
  @Permissions("billing:read")
  list(@TenantId() tenantId: string) {
    return this.billing.listCharges(tenantId);
  }

  @Get(":id")
  @Permissions("billing:read")
  getOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.billing.getCharge(tenantId, id);
  }
}
