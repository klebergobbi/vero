/* eslint-disable no-console -- script de setup/CLI: log de progresso no stdout é intencional. */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { PERMISSIONS, SYSTEM_ROLES } from "@vero/types";

/**
 * Seed IDEMPOTENTE do núcleo Org/Acesso (CLAUDE.md S2).
 * - Roda quantas vezes for preciso sem duplicar (tudo via upsert / ids determinísticos).
 * - Cria: catálogo global de Permission, 1 tenant demo, papéis de sistema + mapeamento
 *   papel→permission, e a CONTA DEMO DE REVISOR de loja (§5) com senha argon2.
 * - Segurança: senha NUNCA hard-coded em produção (vem de SEED_DEMO_PASSWORD); nada de PII no log.
 */

export const prisma = new PrismaClient();

// Singletons demo com ids determinísticos → upsert idempotente sem unique de negócio.
const DEMO_TENANT_SLUG = "vero-demo";
const DEMO_CLINIC_ID = "demo-clinic";
const DEMO_UNIT_ID = "demo-unit";
const DEMO_REVIEWER_EMAIL = "revisor.demo@vero.com.br";
// Conta demo do App do Paciente (revisor de loja, §5). CPF de teste válido.
const DEMO_PATIENT_ID = "demo-patient";
const DEMO_PATIENT_CPF = "39053344705";
const DEMO_PATIENT_EMAIL = "paciente.demo@vero.com.br";

function resolveDemoPassword(): string {
  const fromEnv = process.env.SEED_DEMO_PASSWORD;
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SEED_DEMO_PASSWORD (>=8 chars) é obrigatório em produção — não há senha default.",
    );
  }
  // Apenas dev/local: valor óbvio de demo, documentado nas notas de revisão (§5).
  return "VeroDemo!2026";
}

async function seedPermissions(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: { key: perm.key, description: perm.description },
    });
    ids.set(perm.key, row.id);
  }
  console.log(`  ✓ ${PERMISSIONS.length} permissions`);
  return ids;
}

async function seedTenant(): Promise<string> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: { name: "Clínica Demo Vero" },
    create: { slug: DEMO_TENANT_SLUG, name: "Clínica Demo Vero" },
  });

  const clinic = await prisma.clinic.upsert({
    where: { id: DEMO_CLINIC_ID },
    update: { name: "Unidade Central", tenantId: tenant.id },
    create: {
      id: DEMO_CLINIC_ID,
      tenantId: tenant.id,
      name: "Unidade Central",
    },
  });

  await prisma.unit.upsert({
    where: { id: DEMO_UNIT_ID },
    update: { name: "Matriz", tenantId: tenant.id, clinicId: clinic.id },
    create: {
      id: DEMO_UNIT_ID,
      tenantId: tenant.id,
      clinicId: clinic.id,
      name: "Matriz",
    },
  });

  console.log(`  ✓ tenant demo (${tenant.slug}) + clínica + unidade`);
  return tenant.id;
}

async function seedRoles(
  tenantId: string,
  permissionIds: Map<string, string>,
): Promise<Map<string, string>> {
  const roleIds = new Map<string, string>();
  for (const role of SYSTEM_ROLES) {
    const row = await prisma.role.upsert({
      where: { tenantId_key: { tenantId, key: role.key } },
      update: { name: role.name, isSystem: true },
      create: { tenantId, key: role.key, name: role.name, isSystem: true },
    });
    roleIds.set(role.key, row.id);

    for (const permKey of role.permissions) {
      const permissionId = permissionIds.get(permKey);
      if (!permissionId) {
        throw new Error(`Permission desconhecida no mapeamento: ${permKey}`);
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: row.id, permissionId },
        },
        update: {},
        create: { tenantId, roleId: row.id, permissionId },
      });
    }
  }
  console.log(`  ✓ ${SYSTEM_ROLES.length} papéis de sistema + permissões`);
  return roleIds;
}

async function seedReviewer(
  tenantId: string,
  roleIds: Map<string, string>,
): Promise<void> {
  const gestorRoleId = roleIds.get("GESTOR");
  if (!gestorRoleId) throw new Error("Papel GESTOR não encontrado no seed.");

  // Re-hasheia sempre: garante que a senha demo bata após o seed mesmo se mudou.
  const passwordHash = await argon2.hash(resolveDemoPassword());

  const reviewer = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: DEMO_REVIEWER_EMAIL } },
    update: {
      name: "Revisor Demo",
      roleId: gestorRoleId,
      isActive: true,
      passwordHash,
    },
    create: {
      tenantId,
      email: DEMO_REVIEWER_EMAIL,
      name: "Revisor Demo",
      roleId: gestorRoleId,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userUnit.upsert({
    where: { userId_unitId: { userId: reviewer.id, unitId: DEMO_UNIT_ID } },
    update: {},
    create: { tenantId, userId: reviewer.id, unitId: DEMO_UNIT_ID },
  });

  console.log(`  ✓ conta demo de revisor (${DEMO_REVIEWER_EMAIL})`);
}

async function seedDemoPatient(tenantId: string): Promise<void> {
  // Re-hasheia sempre (garante que a senha demo bata após o seed mesmo se mudou).
  const passwordHash = await argon2.hash(resolveDemoPassword());
  await prisma.patient.upsert({
    where: { id: DEMO_PATIENT_ID },
    update: {
      name: "Paciente Demo",
      tenantId,
      cpf: DEMO_PATIENT_CPF,
      email: DEMO_PATIENT_EMAIL,
      passwordHash,
    },
    create: {
      id: DEMO_PATIENT_ID,
      tenantId,
      name: "Paciente Demo",
      phone: "11999990000",
      cpf: DEMO_PATIENT_CPF,
      email: DEMO_PATIENT_EMAIL,
      leadSource: "OUTROS",
      passwordHash,
    },
  });
  console.log(`  ✓ paciente demo do app (${DEMO_PATIENT_EMAIL})`);
}

export async function main(): Promise<void> {
  console.log("→ Seed Vero (idempotente)…");
  const permissionIds = await seedPermissions();
  const tenantId = await seedTenant();
  const roleIds = await seedRoles(tenantId, permissionIds);
  await seedReviewer(tenantId, roleIds);
  await seedDemoPatient(tenantId);
  console.log("✓ Seed concluído.");
}

// Auto-executa apenas quando rodado direto (ts-node prisma/seed.ts), não ao importar no teste.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error("✗ Seed falhou:", err);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
