import { Controller, Get } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { OrgService } from "./org.service";

/**
 * Listagens de apoio à agenda (unidade/profissional). Gated por
 * `appointment:read`: recepção e dentista precisam escolher unidade/profissional
 * ao agendar, e ambos têm essa permission (mas não necessariamente `user:read`).
 */
@Controller()
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get("units")
  @Permissions("appointment:read")
  listUnits(@TenantId() tenantId: string) {
    return this.org.listUnits(tenantId);
  }

  @Get("professionals")
  @Permissions("appointment:read")
  listProfessionals(@TenantId() tenantId: string) {
    return this.org.listProfessionals(tenantId);
  }
}
