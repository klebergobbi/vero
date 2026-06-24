-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "Budget_tenantId_unitId_idx" ON "Budget"("tenantId", "unitId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
