-- CreateEnum
CREATE TYPE "WaitListStatus" AS ENUM ('WAITING', 'CALLED', 'DONE');

-- CreateTable
CREATE TABLE "WaitList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "WaitListStatus" NOT NULL DEFAULT 'WAITING',
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitList_appointmentId_key" ON "WaitList"("appointmentId");

-- CreateIndex
CREATE INDEX "WaitList_tenantId_status_idx" ON "WaitList"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WaitList_tenantId_unitId_status_idx" ON "WaitList"("tenantId", "unitId", "status");

-- AddForeignKey
ALTER TABLE "WaitList" ADD CONSTRAINT "WaitList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitList" ADD CONSTRAINT "WaitList_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
