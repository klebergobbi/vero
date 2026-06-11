import { ForbiddenException } from "@nestjs/common";
import type {
  AuthenticatedPatient,
  AuthenticatedUser,
} from "../src/auth/strategies/jwt.strategy";
import { DeviceService } from "../src/push/device.service";
import type { PrismaService } from "../src/prisma/prisma.service";

const PATIENT: AuthenticatedPatient = {
  kind: "patient",
  patientId: "p1",
  tenantId: "t1",
};
const STAFF: AuthenticatedUser = {
  kind: "staff",
  userId: "u1",
  tenantId: "t1",
  roleId: "r1",
};

function build(
  overrides: {
    upsert?: jest.Mock;
    updateMany?: jest.Mock;
    deleteMany?: jest.Mock;
  } = {},
) {
  const upsert = overrides.upsert ?? jest.fn().mockResolvedValue({});
  const updateMany =
    overrides.updateMany ?? jest.fn().mockResolvedValue({ count: 1 });
  const deleteMany =
    overrides.deleteMany ?? jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    deviceToken: { upsert, updateMany, deleteMany },
  } as unknown as PrismaService;
  return { svc: new DeviceService(prisma), upsert, updateMany, deleteMany };
}

const TOKEN = "ExponentPushToken[abc123]";

describe("DeviceService (S13a)", () => {
  it("paciente registra: upsert por token único, dono = patientId", async () => {
    const { svc, upsert } = build();
    await svc.register(PATIENT, { token: TOKEN, platform: "IOS" });
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ token: TOKEN });
    expect(arg.create).toMatchObject({
      token: TOKEN,
      tenantId: "t1",
      patientId: "p1",
      optedOut: false,
    });
    expect(arg.create.userId).toBeUndefined();
  });

  it("equipe registra: dono = userId (não patientId)", async () => {
    const { svc, upsert } = build();
    await svc.register(STAFF, { token: TOKEN, platform: "ANDROID" });
    const arg = upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ tenantId: "t1", userId: "u1" });
    expect(arg.create.patientId).toBeUndefined();
  });

  it("opt-out: filtra pelo dono e retorna o novo estado", async () => {
    const { svc, updateMany } = build();
    const res = await svc.setOptOut(PATIENT, { token: TOKEN, optedOut: true });
    expect(res).toEqual({ ok: true, optedOut: true });
    expect(updateMany.mock.calls[0][0].where).toEqual({
      token: TOKEN,
      tenantId: "t1",
      patientId: "p1",
    });
  });

  it("anti-IDOR: opt-out em token de outro (count 0) → 403", async () => {
    const { svc } = build({
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    });
    await expect(
      svc.setOptOut(PATIENT, { token: TOKEN, optedOut: true }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("anti-IDOR: remover token de outro (count 0) → 403", async () => {
    const { svc } = build({
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    });
    await expect(svc.unregister(PATIENT, TOKEN)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("remover o próprio token: ok (count 1)", async () => {
    const { svc, deleteMany } = build();
    await expect(svc.unregister(STAFF, TOKEN)).resolves.toBeUndefined();
    expect(deleteMany.mock.calls[0][0].where).toEqual({
      token: TOKEN,
      tenantId: "t1",
      userId: "u1",
    });
  });
});
