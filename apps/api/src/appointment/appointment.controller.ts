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
import { AppointmentService } from "./appointment.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { CreateAvailabilityDto } from "./dto/create-availability.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { MoveAppointmentDto } from "./dto/move-appointment.dto";

/** Agenda — tenant-scoped + deny-by-default (cada rota declara sua permission). */
@Controller()
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  // --- Disponibilidade (rotas mais específicas antes de /appointments/:id) ---

  @Post("availability")
  @Permissions("appointment:write")
  createAvailability(
    @TenantId() tenantId: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.appointments.createAvailability(tenantId, dto);
  }

  @Get("availability")
  @Permissions("appointment:read")
  listAvailability(
    @TenantId() tenantId: string,
    @Query("unitId") unitId?: string,
    @Query("professionalId") professionalId?: string,
  ) {
    return this.appointments.listAvailability(tenantId, unitId, professionalId);
  }

  // --- Agendamentos ---

  @Post("appointments")
  @Permissions("appointment:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(tenantId, dto);
  }

  @Get("appointments")
  @Permissions("appointment:read")
  findAll(@TenantId() tenantId: string, @Query() query: ListAppointmentsDto) {
    return this.appointments.findAll(tenantId, query);
  }

  @Get("appointments/:id")
  @Permissions("appointment:read")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.appointments.findOne(tenantId, id);
  }

  @Patch("appointments/:id/move")
  @Permissions("appointment:write")
  move(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: MoveAppointmentDto,
  ) {
    return this.appointments.move(tenantId, id, dto);
  }

  @Patch("appointments/:id/cancel")
  @Permissions("appointment:cancel")
  cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.appointments.cancel(tenantId, id);
  }
}
