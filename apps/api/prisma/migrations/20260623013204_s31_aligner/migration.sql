-- CreateEnum
CREATE TYPE "AlignerCaseStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AlignerCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "totalSteps" INTEGER NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" "AlignerCaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlignerCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignerStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlignerStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlignerCase_tenantId_idx" ON "AlignerCase"("tenantId");

-- CreateIndex
CREATE INDEX "AlignerCase_patientId_idx" ON "AlignerCase"("patientId");

-- CreateIndex
CREATE INDEX "AlignerStep_tenantId_idx" ON "AlignerStep"("tenantId");

-- CreateIndex
CREATE INDEX "AlignerStep_caseId_idx" ON "AlignerStep"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "AlignerStep_caseId_number_key" ON "AlignerStep"("caseId", "number");

-- AddForeignKey
ALTER TABLE "AlignerCase" ADD CONSTRAINT "AlignerCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignerCase" ADD CONSTRAINT "AlignerCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignerStep" ADD CONSTRAINT "AlignerStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignerStep" ADD CONSTRAINT "AlignerStep_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AlignerCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
