import { Controller, Get } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { UnitsService } from "./units.service";

/**
 * Gestão + ranking de unidades (S46) — visão do franqueador. Deny-by-default:
 * exige `billing:read` (analítico/gestão), tenant-scoped. Distinto de
 * `GET /network/units` (lista as unidades do próprio usuário, @SelfAccount).
 */
@Controller("network")
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get("units/ranking")
  @Permissions("billing:read")
  ranking(@TenantId() tenantId: string) {
    return this.units.ranking(tenantId);
  }
}
