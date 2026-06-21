import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
} from "@nestjs/common";
import { Patient, PatientId } from "../common/decorators/patient.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { ContractService } from "./contract.service";
import { SignContractDto } from "./dto/contract.dto";

/**
 * Contratos — lado do PACIENTE (S18). `@Patient` põe na faixa do app do paciente;
 * tudo owner-scoped (anti-IDOR). A assinatura captura IP + user-agent + timestamp
 * + hash (trilha de evidência §7).
 */
@Patient()
@Controller("me/contracts")
export class MeContractController {
  constructor(private readonly contracts: ContractService) {}

  @Get()
  list(@TenantId() tenantId: string, @PatientId() patientId: string) {
    return this.contracts.listForPatient(tenantId, patientId);
  }

  @Get(":id")
  getOne(
    @TenantId() tenantId: string,
    @PatientId() patientId: string,
    @Param("id") id: string,
  ) {
    return this.contracts.getForPatient(tenantId, patientId, id);
  }

  @Post(":id/sign")
  @HttpCode(HttpStatus.OK)
  sign(
    @TenantId() tenantId: string,
    @PatientId() patientId: string,
    @Param("id") id: string,
    @Body() dto: SignContractDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.contracts.sign(tenantId, patientId, id, {
      ip,
      ...(userAgent ? { userAgent } : {}),
      ...(dto.signerName ? { signerName: dto.signerName } : {}),
    });
  }
}
