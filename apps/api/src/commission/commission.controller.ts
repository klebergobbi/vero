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
import { CommissionService } from "./commission.service";
import {
  CreateCommissionRuleDto,
  RecordCommissionDto,
} from "./dto/commission.dto";

/** Comissões (S40) — financeiro/gestão (billing:read|write). */
@Controller("commissions")
export class CommissionController {
  constructor(private readonly commissions: CommissionService) {}

  /** POST /commissions/rules — cria uma regra de comissão. */
  @Post("rules")
  @Permissions("billing:write")
  createRule(
    @TenantId() tenantId: string,
    @Body() dto: CreateCommissionRuleDto,
  ) {
    return this.commissions.createRule(tenantId, {
      professionalId: dto.professionalId,
      ...(dto.procedureId ? { procedureId: dto.procedureId } : {}),
      percent: dto.percent,
    });
  }

  @Get("rules")
  @Permissions("billing:read")
  listRules(
    @TenantId() tenantId: string,
    @Query("professionalId") professionalId?: string,
  ) {
    return this.commissions.listRules(tenantId, professionalId);
  }

  /** POST /commissions — registra a comissão de um procedimento executado/pago. */
  @Post()
  @Permissions("billing:write")
  record(@TenantId() tenantId: string, @Body() dto: RecordCommissionDto) {
    return this.commissions.record(tenantId, {
      professionalId: dto.professionalId,
      ...(dto.procedureId ? { procedureId: dto.procedureId } : {}),
      baseCents: dto.baseCents,
      description: dto.description,
      ...(dto.date ? { date: dto.date } : {}),
      ...(dto.reference ? { reference: dto.reference } : {}),
    });
  }

  /** GET /commissions/report?professionalId=&from=&to= — por profissional e período. */
  @Get("report")
  @Permissions("billing:read")
  report(
    @TenantId() tenantId: string,
    @Query("professionalId") professionalId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.commissions.report(tenantId, {
      ...(professionalId ? { professionalId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  /** PATCH /commissions/:id/pay — marca a comissão como repassada. */
  @Patch(":id/pay")
  @Permissions("billing:write")
  pay(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.commissions.markPaid(tenantId, id);
  }
}
