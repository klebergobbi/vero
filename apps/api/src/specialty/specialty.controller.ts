import { Body, Controller, Get, Ip, Param, Put } from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { SaveSpecialtyDto } from "./dto/specialty.dto";
import { SpecialtyService } from "./specialty.service";

/** Fichas por especialidade (S29) — equipe (record:read|write); vinculadas ao prontuário. */
@Controller("specialty")
export class SpecialtyController {
  constructor(private readonly specialty: SpecialtyService) {}

  /** GET /specialty/:patientId/:specialty — versão corrente + histórico (AUDITA). */
  @Get(":patientId/:specialty")
  @Permissions("record:read")
  view(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @Param("specialty") specialty: string,
    @CurrentPrincipal() principal: Principal,
    @Ip() ip: string,
  ) {
    const actorId = principal.kind === "staff" ? principal.userId : undefined;
    return this.specialty.view(tenantId, patientId, specialty, {
      ...(actorId ? { actorId } : {}),
      ip,
    });
  }

  /** PUT /specialty/:patientId/:specialty — salva uma nova versão da ficha. */
  @Put(":patientId/:specialty")
  @Permissions("record:write")
  save(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @Param("specialty") specialty: string,
    @CurrentPrincipal() principal: Principal,
    @Body() dto: SaveSpecialtyDto,
  ) {
    const authorId = principal.kind === "staff" ? principal.userId : "";
    return this.specialty.save(
      tenantId,
      patientId,
      specialty,
      authorId,
      dto.values,
    );
  }
}
