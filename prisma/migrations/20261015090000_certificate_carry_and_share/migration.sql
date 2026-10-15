-- CreateEnum
CREATE TYPE "CredentialTransferDecision" AS ENUM ('ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "AssignmentSource" ADD VALUE 'CARRIED_OVER';

-- AlterTable
ALTER TABLE "assignment" ADD COLUMN     "carriedFromAssignmentId" TEXT;

-- CreateTable
CREATE TABLE "credential_transfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromOrganizationId" TEXT NOT NULL,
    "toOrganizationId" TEXT NOT NULL,
    "decision" "CredentialTransferDecision" NOT NULL,
    "modulesCarried" INTEGER NOT NULL DEFAULT 0,
    "certificatesShared" INTEGER NOT NULL DEFAULT 0,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_share" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credential_transfer_toOrganizationId_idx" ON "credential_transfer"("toOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "credential_transfer_userId_fromOrganizationId_toOrganizatio_key" ON "credential_transfer"("userId", "fromOrganizationId", "toOrganizationId");

-- CreateIndex
CREATE INDEX "certificate_share_organizationId_idx" ON "certificate_share"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_share_certificateId_organizationId_key" ON "certificate_share"("certificateId", "organizationId");

-- AddForeignKey
ALTER TABLE "credential_transfer" ADD CONSTRAINT "credential_transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_transfer" ADD CONSTRAINT "credential_transfer_toOrganizationId_fkey" FOREIGN KEY ("toOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_share" ADD CONSTRAINT "certificate_share_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_share" ADD CONSTRAINT "certificate_share_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_share" ADD CONSTRAINT "certificate_share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

