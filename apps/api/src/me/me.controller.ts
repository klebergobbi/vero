import { Controller, Get } from "@nestjs/common";
import { Patient, PatientId } from "../common/decorators/patient.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
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
}
