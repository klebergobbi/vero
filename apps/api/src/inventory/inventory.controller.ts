import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import {
  CreateInventoryDto,
  CreateItemDto,
  StockInDto,
  StockOutDto,
} from "./dto/inventory.dto";
import { InventoryService } from "./inventory.service";

/** Estoque (S39) — operacional (catalog:read|write). */
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post("inventories")
  @Permissions("catalog:write")
  createInventory(
    @TenantId() tenantId: string,
    @Body() dto: CreateInventoryDto,
  ) {
    return this.inventory.createInventory(tenantId, dto.name);
  }

  @Get("inventories")
  @Permissions("catalog:read")
  listInventories(@TenantId() tenantId: string) {
    return this.inventory.listInventories(tenantId);
  }

  /** GET /inventory/alerts — estoque mínimo + validade próxima. */
  @Get("alerts")
  @Permissions("catalog:read")
  alerts(@TenantId() tenantId: string) {
    return this.inventory.alerts(tenantId);
  }

  @Post("items")
  @Permissions("catalog:write")
  createItem(@TenantId() tenantId: string, @Body() dto: CreateItemDto) {
    return this.inventory.createItem(tenantId, {
      ...(dto.inventoryId ? { inventoryId: dto.inventoryId } : {}),
      name: dto.name,
      unit: dto.unit,
      ...(dto.minQuantity != null ? { minQuantity: dto.minQuantity } : {}),
    });
  }

  @Get("items")
  @Permissions("catalog:read")
  listItems(
    @TenantId() tenantId: string,
    @Query("inventoryId") inventoryId?: string,
  ) {
    return this.inventory.listItems(tenantId, inventoryId);
  }

  /** POST /inventory/items/:id/entrada — entrada de estoque (lote). */
  @Post("items/:id/entrada")
  @Permissions("catalog:write")
  entrada(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: StockInDto,
  ) {
    return this.inventory.entrada(tenantId, id, {
      quantity: dto.quantity,
      ...(dto.costCents != null ? { costCents: dto.costCents } : {}),
      ...(dto.expiresAt ? { expiresAt: dto.expiresAt } : {}),
      ...(dto.code ? { code: dto.code } : {}),
    });
  }

  /** POST /inventory/items/:id/saida — saída/baixa (opc. por procedimento). */
  @Post("items/:id/saida")
  @Permissions("catalog:write")
  saida(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: StockOutDto,
  ) {
    return this.inventory.saida(tenantId, id, {
      quantity: dto.quantity,
      ...(dto.reason ? { reason: dto.reason } : {}),
      ...(dto.procedureId ? { procedureId: dto.procedureId } : {}),
    });
  }

  @Get("items/:id/movements")
  @Permissions("catalog:read")
  movements(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventory.movements(tenantId, id);
  }
}
