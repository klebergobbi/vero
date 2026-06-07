import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PatientService } from "./patient.service";

/**
 * Pacientes — tenant-scoped + deny-by-default (cada rota declara sua permission).
 * A cadeia global de guards (S4) já garante authn + tenant + autorização.
 */
@Controller("patients")
export class PatientController {
  constructor(private readonly patients: PatientService) {}

  @Post()
  @Permissions("patient:write")
  create(@TenantId() tenantId: string, @Body() dto: CreatePatientDto) {
    return this.patients.create(tenantId, dto);
  }

  @Get()
  @Permissions("patient:read")
  findAll(@TenantId() tenantId: string, @Query("q") q?: string) {
    return this.patients.findAll(tenantId, q);
  }

  @Get(":id")
  @Permissions("patient:read")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.patients.findOne(tenantId, id);
  }

  @Patch(":id")
  @Permissions("patient:write")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(tenantId, id, dto);
  }

  @Delete(":id")
  @Permissions("patient:delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param("id") id: string): Promise<void> {
    return this.patients.remove(tenantId, id);
  }
}
