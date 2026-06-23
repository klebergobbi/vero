import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Patient, PatientId } from "../common/decorators/patient.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { AlignerService } from "./aligner.service";
import { CreateAlignerCaseDto } from "./dto/aligner.dto";

/** Casos de alinhadores (S31) — equipe clínica (record:read|write). */
@Controller("aligner")
export class AlignerController {
  constructor(private readonly aligner: AlignerService) {}

  /** POST /aligner/cases — cria o caso com N etapas. */
  @Post("cases")
  @Permissions("record:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateAlignerCaseDto) {
    return this.aligner.createCase(tenantId, {
      patientId: dto.patientId,
      title: dto.title,
      totalSteps: dto.totalSteps,
      intervalDays: dto.intervalDays,
      startDate: dto.startDate,
    });
  }

  @Get("cases")
  @Permissions("record:read")
  list(@TenantId() tenantId: string, @Query("patientId") patientId?: string) {
    return this.aligner.listCases(tenantId, patientId);
  }

  @Get("cases/:id")
  @Permissions("record:read")
  get(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.aligner.getCase(tenantId, id);
  }

  /** POST /aligner/cases/:id/advance — avança o paciente para a próxima etapa. */
  @Post("cases/:id/advance")
  @Permissions("record:write")
  advance(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.aligner.advance(tenantId, id);
  }
}

/** Visão do paciente (S31) — casos próprios com etapa atual e próxima troca. */
@Controller("me/aligner")
export class MeAlignerController {
  constructor(private readonly aligner: AlignerService) {}

  @Get()
  @Patient()
  mine(@TenantId() tenantId: string, @PatientId() patientId: string) {
    return this.aligner.myCases(tenantId, patientId);
  }
}
