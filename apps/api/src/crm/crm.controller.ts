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
import { CrmService } from "./crm.service";
import {
  CreateLeadDto,
  CreateLeadSourceDto,
  UpdateLeadStatusDto,
} from "./dto/crm.dto";

/** CRM (S44) — recepção/marketing (patient:read|write). */
@Controller("crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Post("sources")
  @Permissions("patient:write")
  createSource(@TenantId() tenantId: string, @Body() dto: CreateLeadSourceDto) {
    return this.crm.createSource(tenantId, {
      name: dto.name,
      ...(dto.costCents != null ? { costCents: dto.costCents } : {}),
    });
  }

  @Get("sources")
  @Permissions("patient:read")
  listSources(@TenantId() tenantId: string) {
    return this.crm.listSources(tenantId);
  }

  @Post("leads")
  @Permissions("patient:write")
  createLead(@TenantId() tenantId: string, @Body() dto: CreateLeadDto) {
    return this.crm.createLead(tenantId, {
      name: dto.name,
      phone: dto.phone,
      ...(dto.leadSourceId ? { leadSourceId: dto.leadSourceId } : {}),
      ...(dto.referredByPatientId
        ? { referredByPatientId: dto.referredByPatientId }
        : {}),
      ...(dto.birthDate ? { birthDate: dto.birthDate } : {}),
      ...(dto.city ? { city: dto.city } : {}),
    });
  }

  @Get("leads")
  @Permissions("patient:read")
  listLeads(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.crm.listLeads(tenantId, status);
  }

  /** PATCH /crm/leads/:id/status — move o lead no funil (CLOSED exige valor). */
  @Patch("leads/:id/status")
  @Permissions("patient:write")
  updateStatus(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.crm.updateStatus(tenantId, id, {
      status: dto.status,
      ...(dto.valueCents != null ? { valueCents: dto.valueCents } : {}),
    });
  }

  /** GET /crm/report/sources — ROI por canal. */
  @Get("report/sources")
  @Permissions("patient:read")
  reportSources(@TenantId() tenantId: string) {
    return this.crm.reportBySource(tenantId);
  }

  /** GET /crm/report/referrals — quem indicou quem. */
  @Get("report/referrals")
  @Permissions("patient:read")
  referrals(@TenantId() tenantId: string) {
    return this.crm.referrals(tenantId);
  }

  /** GET /crm/report/demographics — faixa etária + cidade. */
  @Get("report/demographics")
  @Permissions("patient:read")
  demographics(@TenantId() tenantId: string) {
    return this.crm.demographics(tenantId);
  }
}
