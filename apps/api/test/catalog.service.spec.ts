import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CatalogService } from "../src/catalog/catalog.service";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("CatalogService (S16)", () => {
  it("anti-IDOR: editar procedimento de outro tenant → 403", async () => {
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma);
    await expect(
      service.updateProcedure("t1", "alheio", { name: "X" }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.procedure.update).not.toHaveBeenCalled();
  });

  it("createPrice valida que o convênio é do mesmo tenant (403)", async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue({ id: "p1" }) },
      plan: { findFirst: jest.fn().mockResolvedValue(null) }, // convênio de outro tenant
      priceTable: { create: jest.fn() },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma);
    await expect(
      service.createPrice("t1", {
        procedureId: "p1",
        planId: "alheio",
        priceCents: 1000,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.priceTable.create).not.toHaveBeenCalled();
  });

  it("createPrice duplicado (P2002) → 400 amigável", async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue({ id: "p1" }) },
      plan: { findFirst: jest.fn().mockResolvedValue({ id: "pl1" }) },
      priceTable: {
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("dup", {
            code: "P2002",
            clientVersion: "6",
          }),
        ),
      },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma);
    await expect(
      service.createPrice("t1", {
        procedureId: "p1",
        planId: "pl1",
        priceCents: 1000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("removePlan faz soft-delete (deletedAt)", async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      plan: { findFirst: jest.fn().mockResolvedValue({ id: "pl1" }), update },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma);
    await service.removePlan("t1", "pl1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "pl1" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
