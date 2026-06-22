-- CreateTable
CREATE TABLE "SpecialtyForm" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "valuesEnc" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialtyForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialtyForm_tenantId_idx" ON "SpecialtyForm"("tenantId");

-- CreateIndex
CREATE INDEX "SpecialtyForm_recordId_specialty_idx" ON "SpecialtyForm"("recordId", "specialty");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialtyForm_recordId_specialty_version_key" ON "SpecialtyForm"("recordId", "specialty", "version");

-- AddForeignKey
ALTER TABLE "SpecialtyForm" ADD CONSTRAINT "SpecialtyForm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialtyForm" ADD CONSTRAINT "SpecialtyForm_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialtyForm" ADD CONSTRAINT "SpecialtyForm_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
