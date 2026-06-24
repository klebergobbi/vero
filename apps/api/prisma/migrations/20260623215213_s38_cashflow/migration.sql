-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashSource" AS ENUM ('MANUAL', 'PAYMENT', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "ReconcileMethod" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "CashFlow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" "CashSource" NOT NULL DEFAULT 'MANUAL',
    "paymentId" TEXT,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cashFlowId" TEXT NOT NULL,
    "method" "ReconcileMethod" NOT NULL,
    "reference" TEXT,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashFlow_paymentId_key" ON "CashFlow"("paymentId");

-- CreateIndex
CREATE INDEX "CashFlow_tenantId_idx" ON "CashFlow"("tenantId");

-- CreateIndex
CREATE INDEX "CashFlow_tenantId_date_idx" ON "CashFlow"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_cashFlowId_key" ON "BankReconciliation"("cashFlowId");

-- CreateIndex
CREATE INDEX "BankReconciliation_tenantId_idx" ON "BankReconciliation"("tenantId");

-- AddForeignKey
ALTER TABLE "CashFlow" ADD CONSTRAINT "CashFlow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlow" ADD CONSTRAINT "CashFlow_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "CashFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
