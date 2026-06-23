-- CreateEnum
CREATE TYPE "ReturnAlertStatus" AS ENUM ('SCHEDULED', 'TRIGGERED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReturnAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "ReturnAlertStatus" NOT NULL DEFAULT 'SCHEDULED',
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnAlert_tenantId_idx" ON "ReturnAlert"("tenantId");

-- CreateIndex
CREATE INDEX "ReturnAlert_patientId_idx" ON "ReturnAlert"("patientId");

-- CreateIndex
CREATE INDEX "ReturnAlert_status_dueDate_idx" ON "ReturnAlert"("status", "dueDate");

-- AddForeignKey
ALTER TABLE "ReturnAlert" ADD CONSTRAINT "ReturnAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnAlert" ADD CONSTRAINT "ReturnAlert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
