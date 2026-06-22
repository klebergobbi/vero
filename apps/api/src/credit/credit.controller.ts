import { Body, Controller, Get, Ip, Param, Post } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { CreditService } from "./credit.service";
import { CreateCreditCheckDto } from "./dto/credit.dto";

/** Crédito SPC/Serasa (S25) — equipe; tenant-scoped + auditado. */
@Controller("credit-checks")
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Post()
  @Permissions("billing:write")
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCreditCheckDto,
    @CurrentPrincipal() principal: Principal,
    @Ip() ip: string,
  ) {
    const actorId = principal.kind === "staff" ? principal.userId : undefined;
    return this.credit.create(
      tenantId,
      {
        patientId: dto.patientId,
        kind: dto.kind,
        consent: dto.consent,
        ...(dto.amountCents !== undefined
          ? { amountCents: dto.amountCents }
          : {}),
      },
      { ...(actorId ? { actorId } : {}), ip },
    );
  }

  @Get(":id")
  @Permissions("billing:read")
  getOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.credit.get(tenantId, id);
  }
}
