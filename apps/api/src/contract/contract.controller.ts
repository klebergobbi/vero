import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { ContractService } from "./contract.service";
import { GenerateContractDto } from "./dto/contract.dto";

/** Contratos — lado da EQUIPE (S18). Gera de orçamento aprovado e verifica. */
@Controller("contracts")
export class ContractController {
  constructor(private readonly contracts: ContractService) {}

  @Post()
  @Permissions("budget:write")
  generate(@TenantId() tenantId: string, @Body() dto: GenerateContractDto) {
    return this.contracts.generate(tenantId, dto.budgetId);
  }

  @Get(":id")
  @Permissions("budget:read")
  getOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.contracts.getOne(tenantId, id);
  }

  @Get(":id/verify")
  @Permissions("budget:read")
  verify(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.contracts.verify(tenantId, id);
  }
}
