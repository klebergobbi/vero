import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { Patient, PatientId } from "../common/decorators/patient.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { MeBookDto } from "./dto/book.dto";
import { MeSlotsQueryDto } from "./dto/slots-query.dto";
import { MeService } from "./me.service";

/**
 * Rotas do App do Paciente. @Patient põe o controller na faixa de paciente da
 * PermissionsGuard (exige principal de paciente; token de equipe é negado).
 * `tenantId` vem do TenantGuard; `patientId` do principal autenticado.
 */
@Patient()
@Controller("me")
export class MeController {
  constructor(private readonly me: MeService) {}

  /** GET /me/appointments — só as consultas do próprio paciente (anti-IDOR). */
  @Get("appointments")
  myAppointments(@TenantId() tenantId: string, @PatientId() patientId: string) {
    return this.me.myAppointments(tenantId, patientId);
  }

  /** POST /me/appointments/:id/confirm — confirma presença (idempotente). */
  @Post("appointments/:id/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(
    @TenantId() tenantId: string,
    @PatientId() patientId: string,
    @Param("id") id: string,
  ) {
    return this.me.confirmAppointment(tenantId, patientId, id);
  }

  /** POST /me/appointments/:id/checkin — self check-in ao chegar (idempotente). */
  @Post("appointments/:id/checkin")
  @HttpCode(HttpStatus.OK)
  checkIn(
    @TenantId() tenantId: string,
    @PatientId() patientId: string,
    @Param("id") id: string,
  ) {
    return this.me.checkIn(tenantId, patientId, id);
  }

  /** GET /me/units — unidades da clínica (seletor de agendamento). */
  @Get("units")
  myUnits(@TenantId() tenantId: string) {
    return this.me.myUnits(tenantId);
  }

  /** GET /me/professionals — profissionais da clínica (seletor de agendamento). */
  @Get("professionals")
  myProfessionals(@TenantId() tenantId: string) {
    return this.me.myProfessionals(tenantId);
  }

  /** GET /me/installments — parcelas do próprio paciente (§S21, anti-IDOR). */
  @Get("installments")
  myInstallments(@TenantId() tenantId: string, @PatientId() patientId: string) {
    return this.me.myInstallments(tenantId, patientId);
  }

  /** GET /me/slots — horários livres p/ o paciente agendar online (§S15c). */
  @Get("slots")
  mySlots(@TenantId() tenantId: string, @Query() query: MeSlotsQueryDto) {
    return this.me.mySlots(
      tenantId,
      query.unitId,
      query.professionalId,
      query.date,
    );
  }

  /** POST /me/book — paciente logado reserva um slot livre (sem virar lead). */
  @Post("book")
  @HttpCode(HttpStatus.OK)
  book(
    @TenantId() tenantId: string,
    @PatientId() patientId: string,
    @Body() dto: MeBookDto,
  ) {
    return this.me.book(tenantId, patientId, dto);
  }
}
