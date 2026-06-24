import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WINDOW_DAYS = 30;

/**
 * Estoque (§6/S39): insumos com lotes (validade/custo) e movimentos de entrada/
 * saída. `Item.quantity` é o cache do estoque, mantido em `$transaction` a cada
 * movimento. Saída consome lotes por validade (FIFO) e pode registrar a baixa por
 * procedimento (S16). Alertas: estoque mínimo + validade próxima. Tenant-scoped.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // --- almoxarifado ---

  async createInventory(tenantId: string, name: string) {
    return this.prisma.inventory.create({
      data: { tenantId, name },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async listInventories(tenantId: string) {
    return this.prisma.inventory.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, createdAt: true },
    });
  }

  // --- insumos ---

  async createItem(
    tenantId: string,
    input: {
      inventoryId?: string;
      name: string;
      unit: string;
      minQuantity?: number;
    },
  ) {
    const inventoryId =
      input.inventoryId ?? (await this.ensureDefaultInventory(tenantId));
    if (input.inventoryId) {
      await this.assertInventory(tenantId, input.inventoryId);
    }
    return this.prisma.item.create({
      data: {
        tenantId,
        inventoryId,
        name: input.name,
        unit: input.unit,
        minQuantity: input.minQuantity ?? 0,
      },
      select: this.itemSelect(),
    });
  }

  async listItems(tenantId: string, inventoryId?: string) {
    const scope = new TenantScope(tenantId);
    const items = await this.prisma.item.findMany({
      where: scope.where<Prisma.ItemWhereInput>({
        active: true,
        ...(inventoryId ? { inventoryId } : {}),
      }),
      orderBy: { name: "asc" },
      select: this.itemSelect(),
    });
    return items.map((i) => ({ ...i, isLow: i.quantity <= i.minQuantity }));
  }

  // --- movimentos ---

  /** Entrada: cria um lote (validade/custo) e soma ao estoque. */
  async entrada(
    tenantId: string,
    itemId: string,
    input: {
      quantity: number;
      costCents?: number;
      expiresAt?: string;
      code?: string;
    },
  ) {
    await this.assertItem(tenantId, itemId);
    if (input.quantity <= 0) {
      throw new BadRequestException("Quantidade inválida.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.batch.create({
        data: {
          tenantId,
          itemId,
          quantity: input.quantity,
          costCents: input.costCents ?? 0,
          ...(input.code ? { code: input.code } : {}),
          ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
        },
      });
      await tx.stockMovement.create({
        data: { tenantId, itemId, type: "IN", quantity: input.quantity },
      });
      await tx.item.update({
        where: { id: itemId },
        data: { quantity: { increment: input.quantity } },
      });
    });
    return this.getItem(tenantId, itemId);
  }

  /** Saída: consome lotes por validade (FIFO) e baixa do estoque (opc. por procedimento). */
  async saida(
    tenantId: string,
    itemId: string,
    input: { quantity: number; reason?: string; procedureId?: string },
  ) {
    const item = await this.assertItem(tenantId, itemId);
    if (input.quantity <= 0) {
      throw new BadRequestException("Quantidade inválida.");
    }
    if (item.quantity < input.quantity) {
      throw new BadRequestException("Estoque insuficiente.");
    }

    await this.prisma.$transaction(async (tx) => {
      // Consome dos lotes que vencem primeiro (FIFO por validade).
      const batches = await tx.batch.findMany({
        where: { itemId, quantity: { gt: 0 } },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
        select: { id: true, quantity: true },
      });
      let remaining = input.quantity;
      for (const b of batches) {
        if (remaining <= 0) break;
        const take = Math.min(b.quantity, remaining);
        await tx.batch.update({
          where: { id: b.id },
          data: { quantity: { decrement: take } },
        });
        remaining -= take;
      }
      await tx.stockMovement.create({
        data: {
          tenantId,
          itemId,
          type: "OUT",
          quantity: input.quantity,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.procedureId ? { procedureId: input.procedureId } : {}),
        },
      });
      await tx.item.update({
        where: { id: itemId },
        data: { quantity: { decrement: input.quantity } },
      });
    });
    return this.getItem(tenantId, itemId);
  }

  async movements(tenantId: string, itemId: string) {
    await this.assertItem(tenantId, itemId);
    return this.prisma.stockMovement.findMany({
      where: { tenantId, itemId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        quantity: true,
        reason: true,
        procedureId: true,
        createdAt: true,
      },
    });
  }

  // --- alertas ---

  /** Estoque mínimo + lotes com validade próxima/vencida (com quantidade). */
  async alerts(tenantId: string, now: Date = new Date()) {
    const limit = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);
    const [lowStock, expiring] = await Promise.all([
      this.prisma.item.findMany({
        where: {
          tenantId,
          active: true,
          quantity: { lte: this.prisma.item.fields.minQuantity },
        },
        orderBy: { name: "asc" },
        select: this.itemSelect(),
      }),
      this.prisma.batch.findMany({
        where: {
          tenantId,
          quantity: { gt: 0 },
          expiresAt: { not: null, lte: limit },
        },
        orderBy: { expiresAt: "asc" },
        select: {
          id: true,
          code: true,
          quantity: true,
          expiresAt: true,
          item: { select: { id: true, name: true, unit: true } },
        },
      }),
    ]);
    return { lowStock, expiring };
  }

  // --- internos ---

  private async getItem(tenantId: string, itemId: string) {
    const scope = new TenantScope(tenantId);
    const item = await this.prisma.item.findFirst({
      where: scope.where<Prisma.ItemWhereInput>({ id: itemId }),
      select: this.itemSelect(),
    });
    const owned = scope.ensureOwned(item);
    return { ...owned, isLow: owned.quantity <= owned.minQuantity };
  }

  private async assertItem(tenantId: string, itemId: string) {
    const scope = new TenantScope(tenantId);
    const item = await this.prisma.item.findFirst({
      where: scope.where<Prisma.ItemWhereInput>({ id: itemId }),
      select: { id: true, quantity: true },
    });
    return scope.ensureOwned(item); // 403 anti-IDOR
  }

  private async assertInventory(tenantId: string, inventoryId: string) {
    const scope = new TenantScope(tenantId);
    const inv = await this.prisma.inventory.findFirst({
      where: scope.where<Prisma.InventoryWhereInput>({ id: inventoryId }),
      select: { id: true },
    });
    scope.ensureOwned(inv); // 403 anti-IDOR
  }

  private async ensureDefaultInventory(tenantId: string): Promise<string> {
    const existing = await this.prisma.inventory.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.inventory.create({
      data: { tenantId, name: "Principal" },
      select: { id: true },
    });
    return created.id;
  }

  private itemSelect() {
    return {
      id: true,
      inventoryId: true,
      name: true,
      unit: true,
      quantity: true,
      minQuantity: true,
      createdAt: true,
    } satisfies Prisma.ItemSelect;
  }
}
