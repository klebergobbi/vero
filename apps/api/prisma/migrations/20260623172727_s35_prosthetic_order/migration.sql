-- CreateEnum
CREATE TYPE "ProstheticOrderStatus" AS ENUM ('REQUESTED', 'SENT', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProstheticOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "treatmentItemId" TEXT,
    "labName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProstheticOrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "sentAt" TIMESTAMP(3),
    "expectedReturnDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProstheticOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProstheticOrder_tenantId_idx" ON "ProstheticOrder"("tenantId");

-- CreateIndex
CREATE INDEX "ProstheticOrder_patientId_idx" ON "ProstheticOrder"("patientId");

-- CreateIndex
CREATE INDEX "ProstheticOrder_tenantId_status_idx" ON "ProstheticOrder"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "ProstheticOrder" ADD CONSTRAINT "ProstheticOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProstheticOrder" ADD CONSTRAINT "ProstheticOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProstheticOrder" ADD CONSTRAINT "ProstheticOrder_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "TreatmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
