-- CreateEnum
CREATE TYPE "RoyaltyStatus" AS ENUM ('PENDING', 'CHARGED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Royalty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "RoyaltyStatus" NOT NULL DEFAULT 'PENDING',
    "asaasPaymentId" TEXT,
    "pixPayload" TEXT,
    "boletoBarcode" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Royalty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Royalty_tenantId_idx" ON "Royalty"("tenantId");

-- CreateIndex
CREATE INDEX "Royalty_tenantId_unitId_idx" ON "Royalty"("tenantId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Royalty_tenantId_unitId_periodStart_periodEnd_key" ON "Royalty"("tenantId", "unitId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "Royalty" ADD CONSTRAINT "Royalty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Royalty" ADD CONSTRAINT "Royalty_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
