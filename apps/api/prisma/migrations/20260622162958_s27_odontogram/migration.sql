-- CreateTable
CREATE TABLE "Odontogram" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Odontogram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToothCondition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "odontogramId" TEXT NOT NULL,
    "toothNumber" INTEGER NOT NULL,
    "face" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToothCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Odontogram_recordId_key" ON "Odontogram"("recordId");

-- CreateIndex
CREATE INDEX "Odontogram_tenantId_idx" ON "Odontogram"("tenantId");

-- CreateIndex
CREATE INDEX "ToothCondition_tenantId_idx" ON "ToothCondition"("tenantId");

-- CreateIndex
CREATE INDEX "ToothCondition_odontogramId_idx" ON "ToothCondition"("odontogramId");

-- CreateIndex
CREATE UNIQUE INDEX "ToothCondition_odontogramId_toothNumber_face_key" ON "ToothCondition"("odontogramId", "toothNumber", "face");

-- AddForeignKey
ALTER TABLE "Odontogram" ADD CONSTRAINT "Odontogram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odontogram" ADD CONSTRAINT "Odontogram_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothCondition" ADD CONSTRAINT "ToothCondition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothCondition" ADD CONSTRAINT "ToothCondition_odontogramId_fkey" FOREIGN KEY ("odontogramId") REFERENCES "Odontogram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
