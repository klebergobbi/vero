-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INDICACAO_PACIENTE', 'INDICACAO_PROFISSIONAL', 'INSTAGRAM', 'FACEBOOK', 'GOOGLE', 'WHATSAPP', 'SITE', 'OUTROS');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "leadSource" "LeadSource" NOT NULL,
    "referredById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "Patient_referredById_idx" ON "Patient"("referredById");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_tenantId_cpf_key" ON "Patient"("tenantId", "cpf");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
