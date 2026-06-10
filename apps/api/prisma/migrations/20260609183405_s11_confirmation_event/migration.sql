-- CreateTable
CREATE TABLE "ConfirmationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfirmationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfirmationEvent_tenantId_idx" ON "ConfirmationEvent"("tenantId");

-- CreateIndex
CREATE INDEX "ConfirmationEvent_appointmentId_idx" ON "ConfirmationEvent"("appointmentId");

-- AddForeignKey
ALTER TABLE "ConfirmationEvent" ADD CONSTRAINT "ConfirmationEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmationEvent" ADD CONSTRAINT "ConfirmationEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
