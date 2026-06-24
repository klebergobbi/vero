-- CreateEnum
CREATE TYPE "CRMLeadStatus" AS ENUM ('NEW', 'SCHEDULED', 'CLOSED', 'LOST');

-- CreateTable
CREATE TABLE "LeadChannel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "leadSourceId" TEXT,
    "referredByPatientId" TEXT,
    "convertedPatientId" TEXT,
    "status" "CRMLeadStatus" NOT NULL DEFAULT 'NEW',
    "valueCents" INTEGER NOT NULL DEFAULT 0,
    "birthDate" TIMESTAMP(3),
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerPatientId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadChannel_tenantId_idx" ON "LeadChannel"("tenantId");

-- CreateIndex
CREATE INDEX "CRMLead_tenantId_idx" ON "CRMLead"("tenantId");

-- CreateIndex
CREATE INDEX "CRMLead_tenantId_status_idx" ON "CRMLead"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_leadId_key" ON "Referral"("leadId");

-- CreateIndex
CREATE INDEX "Referral_tenantId_idx" ON "Referral"("tenantId");

-- AddForeignKey
ALTER TABLE "LeadChannel" ADD CONSTRAINT "LeadChannel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMLead" ADD CONSTRAINT "CRMLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMLead" ADD CONSTRAINT "CRMLead_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "LeadChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerPatientId_fkey" FOREIGN KEY ("referrerPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CRMLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
