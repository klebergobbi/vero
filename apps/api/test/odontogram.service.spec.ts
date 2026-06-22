import { ForbiddenException } from "@nestjs/common";
import type { AuditService } from "../src/common/audit/audit.service";
import { OdontogramService } from "../src/odontogram/odontogram.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(patient: unknown) {
  const upsert = jest.fn().mockResolvedValue({});
  const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(patient) },
    medicalRecord: { upsert: jest.fn().mockResolvedValue({ id: "rec1" }) },
    odontogram: { upsert: jest.fn().mockResolvedValue({ id: "od1" }) },
    toothCondition: { upsert, deleteMany, findMany },
  } as unknown as PrismaService;
  const audit = { record: jest.fn() } as unknown as AuditService;
  return {
    service: new OdontogramService(prisma, audit),
    upsert,
    deleteMany,
  };
}

describe("OdontogramService (S27)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build(null);
    await expect(
      service.setCondition("t1", "alheio", {
        toothNumber: 11,
        face: "OCCLUSAL",
        condition: "CARIES",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("marca condição (≠HEALTHY) → upsert da ToothCondition", async () => {
    const { service, upsert, deleteMany } = build({ id: "p1" });
    await service.setCondition("t1", "p1", {
      toothNumber: 11,
      face: "OCCLUSAL",
      condition: "CARIES",
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("HEALTHY limpa o registro (delete, sem upsert)", async () => {
    const { service, upsert, deleteMany } = build({ id: "p1" });
    await service.setCondition("t1", "p1", {
      toothNumber: 11,
      face: "OCCLUSAL",
      condition: "HEALTHY",
    });
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });
});
