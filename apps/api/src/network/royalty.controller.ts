import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import {
  CalculateRoyaltyDto,
  ChargeRoyaltyDto,
  ListRoyaltiesDto,
} from "./dto/royalty.dto";
import { RoyaltyService } from "./royalty.service";

/**
 * Royalties por unidade de franquia (§6/S47). Deny-by-default via guards globais.
 * Operações financeiras → `billing:write`; consultas → `billing:read`.
 * Valores nunca vêm do cliente (base calculada do faturamento, split no servidor).
 */
@Controller("network/royalties")
export class RoyaltyController {
  constructor(private readonly royalties: RoyaltyService) {}

  /**
   * Calcula o faturamento da unidade no período e cria a royalty PENDING.
   * Idempotente: mesmo (unitId × período) → 409.
   */
  @Post()
  @Permissions("billing:write")
  calculate(@TenantId() tenantId: string, @Body() dto: CalculateRoyaltyDto) {
    return this.royalties.calculate(tenantId, dto);
  }

  /** Lista royalties do tenant; filtro opcional por unidade. */
  @Get()
  @Permissions("billing:read")
  list(@TenantId() tenantId: string, @Query() q: ListRoyaltiesDto) {
    return this.royalties.list(tenantId, q.unitId);
  }

  /**
   * Gera cobrança Asaas para a royalty PENDING → CHARGED.
   * O valor é o `amountCents` calculado na criação; não aceita override.
   */
  @Post(":id/charge")
  @Permissions("billing:write")
  charge(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: ChargeRoyaltyDto,
  ) {
    return this.royalties.charge(tenantId, id, dto);
  }

  /** Concilia manualmente o recebimento da royalty → PAID. */
  @Post(":id/pay")
  @Permissions("billing:write")
  markPaid(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.royalties.markPaid(tenantId, id);
  }

  /** Cancela uma royalty PENDING ou CHARGED. */
  @Post(":id/cancel")
  @Permissions("billing:write")
  cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.royalties.cancel(tenantId, id);
  }
}
