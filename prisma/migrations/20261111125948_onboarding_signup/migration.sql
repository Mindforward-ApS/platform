-- CreateEnum
CREATE TYPE "PersonalPlanChoice" AS ENUM ('SINGLE', 'FRIEND', 'STUDENT');

-- CreateEnum
CREATE TYPE "TeamSizeBand" AS ENUM ('SIZE_1_9', 'SIZE_10_PLUS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OnboardingStartPath" AS ENUM ('PLACEMENT_TEST', 'FROM_SCRATCH');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "onboarding_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "personalPlan" "PersonalPlanChoice",
    "friendEmail" TEXT,
    "studentEmail" TEXT,
    "teamSizeBand" "TeamSizeBand",
    "startPath" "OnboardingStartPath",
    "trackId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_profile_userId_idx" ON "onboarding_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_profile_organizationId_userId_key" ON "onboarding_profile"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "onboarding_profile" ADD CONSTRAINT "onboarding_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_profile" ADD CONSTRAINT "onboarding_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_profile" ADD CONSTRAINT "onboarding_profile_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
