import { Body, Controller, Get, Ip, Param, Put } from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { SetToothConditionDto } from "./dto/odontogram.dto";
import { OdontogramService } from "./odontogram.service";

/** Odontograma (S27) — equipe (record:read|write); vinculado ao prontuário. */
@Controller("odontogram")
export class OdontogramController {
  constructor(private readonly odontogram: OdontogramService) {}

  /** GET /odontogram/:patientId — mapa dental (AUDITA SENSITIVE_READ). */
  @Get(":patientId")
  @Permissions("record:read")
  view(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @CurrentPrincipal() principal: Principal,
    @Ip() ip: string,
  ) {
    const actorId = principal.kind === "staff" ? principal.userId : undefined;
    return this.odontogram.view(tenantId, patientId, {
      ...(actorId ? { actorId } : {}),
      ip,
    });
  }

  /** PUT /odontogram/:patientId/conditions — marca/limpa condição de dente/face. */
  @Put(":patientId/conditions")
  @Permissions("record:write")
  setCondition(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @Body() dto: SetToothConditionDto,
  ) {
    return this.odontogram.setCondition(tenantId, patientId, dto);
  }
}
