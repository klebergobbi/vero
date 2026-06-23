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
import {
  CreateReturnAlertDto,
  SetReturnAlertStatusDto,
} from "./dto/return.dto";
import { ReturnService } from "./return.service";

/** Alertas de retorno (S33) — equipe/recepção (appointment:read|write). */
@Controller("return-alerts")
export class ReturnController {
  constructor(private readonly returns: ReturnService) {}

  /** POST /return-alerts — agenda um alerta de retorno (fim da consulta). */
  @Post()
  @Permissions("appointment:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateReturnAlertDto) {
    return this.returns.create(tenantId, {
      patientId: dto.patientId,
      ...(dto.appointmentId ? { appointmentId: dto.appointmentId } : {}),
      ...(dto.dueDate ? { dueDate: dto.dueDate } : {}),
      ...(dto.intervalDays ? { intervalDays: dto.intervalDays } : {}),
      ...(dto.reason ? { reason: dto.reason } : {}),
    });
  }

  @Get()
  @Permissions("appointment:read")
  list(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.returns.list(tenantId, status);
  }

  /** PATCH /return-alerts/:id/status — marca reagendado (DONE) ou cancelado. */
  @Patch(":id/status")
  @Permissions("appointment:write")
  setStatus(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: SetReturnAlertStatusDto,
  ) {
    return this.returns.setStatus(tenantId, id, dto.status);
  }
}
