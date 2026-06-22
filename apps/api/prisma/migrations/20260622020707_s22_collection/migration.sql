-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "messagingOptOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CollectionRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionRule_tenantId_idx" ON "CollectionRule"("tenantId");

-- CreateIndex
CREATE INDEX "CollectionEvent_tenantId_idx" ON "CollectionEvent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEvent_installmentId_stepKey_key" ON "CollectionEvent"("installmentId", "stepKey");

-- AddForeignKey
ALTER TABLE "CollectionRule" ADD CONSTRAINT "CollectionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
