-- CreateEnum
CREATE TYPE "CreditCheckKind" AS ENUM ('QUERY', 'INCLUSION');

-- CreateEnum
CREATE TYPE "CreditCheckStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREDIT_CHECK';
ALTER TYPE "AuditAction" ADD VALUE 'CREDIT_INCLUSION';

-- CreateTable
CREATE TABLE "CreditCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" "CreditCheckKind" NOT NULL,
    "status" "CreditCheckStatus" NOT NULL DEFAULT 'PENDING',
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "amountCents" INTEGER,
    "externalId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditCheck_tenantId_idx" ON "CreditCheck"("tenantId");

-- CreateIndex
CREATE INDEX "CreditCheck_patientId_idx" ON "CreditCheck"("patientId");

-- AddForeignKey
ALTER TABLE "CreditCheck" ADD CONSTRAINT "CreditCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCheck" ADD CONSTRAINT "CreditCheck_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
