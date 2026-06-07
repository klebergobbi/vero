import * as argon2 from "argon2";
import { PERMISSIONS, SYSTEM_ROLES } from "@vero/types";
import { main, prisma } from "../prisma/seed";

/**
 * Teste de IDEMPOTÊNCIA do seed (CLAUDE.md S2: "roda 2x sem duplicar").
 *
 * Integração: exige Postgres com schema migrado. Fica gated por RUN_DB_TESTS=1
 * (script `pnpm --filter @vero/api test:int`) para que `pnpm test`/CI permaneçam
 * verdes sem banco. O CI ganha um serviço Postgres na S52.
 */
const runDbTests = process.env.RUN_DB_TESTS === "1";
const describeDb = runDbTests ? describe : describe.skip;

describeDb("seed (idempotência)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function counts() {
    const [
      permissions,
      tenants,
      clinics,
      units,
      roles,
      rolePermissions,
      users,
    ] = await Promise.all([
      prisma.permission.count(),
      prisma.tenant.count(),
      prisma.clinic.count(),
      prisma.unit.count(),
      prisma.role.count(),
      prisma.rolePermission.count(),
      prisma.user.count(),
    ]);
    return {
      permissions,
      tenants,
      clinics,
      units,
      roles,
      rolePermissions,
      users,
    };
  }

  it("cria tudo e, ao rodar 2x, não duplica", async () => {
    await main();
    const first = await counts();

    // O seed criou o catálogo e o tenant demo.
    expect(first.permissions).toBe(PERMISSIONS.length);
    expect(first.roles).toBeGreaterThanOrEqual(SYSTEM_ROLES.length);
    expect(first.tenants).toBeGreaterThanOrEqual(1);
    expect(first.users).toBeGreaterThanOrEqual(1);

    await main();
    const second = await counts();

    // Segunda execução não altera nenhuma contagem → idempotente.
    expect(second).toEqual(first);
  }, 60_000);

  it("a senha da conta demo de revisor confere após o seed", async () => {
    await main();
    const reviewer = await prisma.user.findFirst({
      where: { email: "revisor.demo@vero.com.br" },
    });
    expect(reviewer).not.toBeNull();
    const password = process.env.SEED_DEMO_PASSWORD ?? "VeroDemo!2026";
    await expect(argon2.verify(reviewer!.passwordHash, password)).resolves.toBe(
      true,
    );
  }, 60_000);
});
