import { ForbiddenException } from "@nestjs/common";
import type { AuthService } from "../src/auth/auth.service";
import type {
  AuthenticatedPatient,
  AuthenticatedUser,
} from "../src/auth/strategies/jwt.strategy";
import { AccessService } from "../src/network/access.service";
import type { PrismaService } from "../src/prisma/prisma.service";

const STAFF: AuthenticatedUser = {
  kind: "staff",
  userId: "u1",
  tenantId: "t1",
  roleId: "r1",
};
const PATIENT: AuthenticatedPatient = {
  kind: "patient",
  patientId: "p1",
  tenantId: "t1",
};

function build(opts: { units?: unknown[]; membership?: unknown }) {
  const findMany = jest.fn().mockResolvedValue(opts.units ?? []);
  const findFirst = jest.fn().mockResolvedValue(opts.membership ?? null);
  const prisma = {
    userUnit: { findMany, findFirst },
  } as unknown as PrismaService;
  const issueForStaff = jest
    .fn()
    .mockResolvedValue({ accessToken: "a", refreshToken: "r" });
  const auth = { issueForStaff } as unknown as AuthService;
  return { service: new AccessService(prisma, auth), findFirst, issueForStaff };
}

describe("AccessService (S45)", () => {
  it("listMyUnits devolve só as unidades autorizadas do usuário", async () => {
    const { service } = build({
      units: [{ unit: { id: "un1", name: "Matriz" } }],
    });
    const res = await service.listMyUnits(STAFF);
    expect(res).toEqual([{ id: "un1", name: "Matriz" }]);
  });

  it("listMyUnits nega paciente (sem unidades) → 403", async () => {
    const { service } = build({});
    await expect(service.listMyUnits(PATIENT)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("switchUnit revalida no servidor: sem vínculo → 403 (anti-IDOR)", async () => {
    const { service, issueForStaff } = build({ membership: null });
    await expect(service.switchUnit(STAFF, "un-alheia")).rejects.toThrow(
      ForbiddenException,
    );
    expect(issueForStaff).not.toHaveBeenCalled(); // não emite token p/ unidade não-autorizada
  });

  it("switchUnit autorizado re-emite tokens com a nova unidade ativa", async () => {
    const { service, issueForStaff } = build({ membership: { id: "uu1" } });
    const res = await service.switchUnit(STAFF, "un2");
    expect(issueForStaff).toHaveBeenCalledWith({
      sub: "u1",
      tenantId: "t1",
      roleId: "r1",
      unitId: "un2",
    });
    expect(res).toEqual({ accessToken: "a", refreshToken: "r", unitId: "un2" });
  });
});
