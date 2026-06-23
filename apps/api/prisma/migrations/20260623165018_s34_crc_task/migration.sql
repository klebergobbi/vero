-- CreateEnum
CREATE TYPE "CRCTaskType" AS ENUM ('RETURN', 'POST_SALE', 'REACTIVATION', 'BIRTHDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "CRCTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "CRCTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "CRCTaskType" NOT NULL,
    "status" "CRCTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedToId" TEXT,
    "sourceAlertId" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRCTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CRCTask_sourceAlertId_key" ON "CRCTask"("sourceAlertId");

-- CreateIndex
CREATE INDEX "CRCTask_tenantId_idx" ON "CRCTask"("tenantId");

-- CreateIndex
CREATE INDEX "CRCTask_tenantId_status_idx" ON "CRCTask"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "CRCTask" ADD CONSTRAINT "CRCTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRCTask" ADD CONSTRAINT "CRCTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRCTask" ADD CONSTRAINT "CRCTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRCTask" ADD CONSTRAINT "CRCTask_sourceAlertId_fkey" FOREIGN KEY ("sourceAlertId") REFERENCES "ReturnAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
