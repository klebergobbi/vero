-- CreateEnum
CREATE TYPE "AnamnesisStatus" AS ENUM ('PENDING', 'SIGNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AnamnesisTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "procedureKey" TEXT,
    "questions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnamnesisTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "recordId" TEXT,
    "status" "AnamnesisStatus" NOT NULL DEFAULT 'PENDING',
    "answersEnc" TEXT,
    "contentHash" TEXT,
    "signerIp" TEXT,
    "signedAt" TIMESTAMP(3),
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnamnesisTemplate_tenantId_idx" ON "AnamnesisTemplate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_tokenHash_key" ON "Anamnesis"("tokenHash");

-- CreateIndex
CREATE INDEX "Anamnesis_tenantId_idx" ON "Anamnesis"("tenantId");

-- CreateIndex
CREATE INDEX "Anamnesis_patientId_idx" ON "Anamnesis"("patientId");

-- AddForeignKey
ALTER TABLE "AnamnesisTemplate" ADD CONSTRAINT "AnamnesisTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AnamnesisTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
