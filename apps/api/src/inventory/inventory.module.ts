import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

/**
 * Estoque (S39): insumos com lotes (validade/custo), entrada/saída e alertas de
 * estoque mínimo e validade. Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
