-- CreateEnum
CREATE TYPE "IndustryCodeSystem" AS ENUM ('DB25', 'DB07');

-- CreateEnum
CREATE TYPE "ConnectorPlatform" AS ENUM ('CLAUDE', 'CHATGPT', 'COPILOT');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('OFFICIAL', 'THIRD_PARTY', 'NONE', 'UNVERIFIED');

-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'CONNECTOR_DEMO';

-- CreateTable
CREATE TABLE "industry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_code" (
    "id" TEXT NOT NULL,
    "system" "IndustryCodeSystem" NOT NULL,
    "prefix" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,

    CONSTRAINT "industry_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_task" (
    "industryId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "industry_task_pkey" PRIMARY KEY ("industryId","taskId")
);

-- CreateTable
CREATE TABLE "system_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "system_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_system" (
    "industryId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "preselected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "industry_system_pkey" PRIMARY KEY ("industryId","systemId")
);

-- CreateTable
CREATE TABLE "connector" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_system" (
    "connectorId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "connector_system_pkey" PRIMARY KEY ("connectorId","systemId")
);

-- CreateTable
CREATE TABLE "connector_task" (
    "connectorId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "connector_task_pkey" PRIMARY KEY ("connectorId","taskId")
);

-- CreateTable
CREATE TABLE "connector_availability" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "platform" "ConnectorPlatform" NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "connector_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_connector_use_case" (
    "industryId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "industry_connector_use_case_pkey" PRIMARY KEY ("industryId","connectorId")
);

-- CreateTable
CREATE TABLE "connector_demo" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "industryId" TEXT,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "prompt" TEXT NOT NULL,
    "outputKind" TEXT NOT NULL,

    CONSTRAINT "connector_demo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_demo_run" (
    "id" TEXT NOT NULL,
    "demoId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "ConnectorPlatform" NOT NULL,
    "promptEdited" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_demo_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_profile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industryId" TEXT,
    "cvr" TEXT,
    "companyName" TEXT,
    "industryCode" TEXT,
    "industryCodeSystem" "IndustryCodeSystem",
    "selectedSystemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_lookup_cache" (
    "id" TEXT NOT NULL,
    "cvr" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_lookup_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industry_slug_key" ON "industry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "industry_code_system_prefix_key" ON "industry_code"("system", "prefix");

-- CreateIndex
CREATE UNIQUE INDEX "task_slug_key" ON "task"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "system_category_slug_key" ON "system_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "system_slug_key" ON "system"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "connector_slug_key" ON "connector"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "connector_availability_connectorId_platform_key" ON "connector_availability"("connectorId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "connector_demo_slug_key" ON "connector_demo"("slug");

-- CreateIndex
CREATE INDEX "connector_demo_connectorId_industryId_idx" ON "connector_demo"("connectorId", "industryId");

-- CreateIndex
CREATE INDEX "connector_demo_run_connectorId_createdAt_idx" ON "connector_demo_run"("connectorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "work_profile_organizationId_userId_key" ON "work_profile"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_lookup_cache_cvr_key" ON "company_lookup_cache"("cvr");

-- AddForeignKey
ALTER TABLE "industry_code" ADD CONSTRAINT "industry_code_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_task" ADD CONSTRAINT "industry_task_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_task" ADD CONSTRAINT "industry_task_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system" ADD CONSTRAINT "system_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "system_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_system" ADD CONSTRAINT "industry_system_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_system" ADD CONSTRAINT "industry_system_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "system"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_system" ADD CONSTRAINT "connector_system_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_system" ADD CONSTRAINT "connector_system_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "system"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_task" ADD CONSTRAINT "connector_task_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_task" ADD CONSTRAINT "connector_task_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_availability" ADD CONSTRAINT "connector_availability_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_connector_use_case" ADD CONSTRAINT "industry_connector_use_case_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_connector_use_case" ADD CONSTRAINT "industry_connector_use_case_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_demo" ADD CONSTRAINT "connector_demo_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_demo" ADD CONSTRAINT "connector_demo_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_demo_run" ADD CONSTRAINT "connector_demo_run_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "connector_demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_demo_run" ADD CONSTRAINT "connector_demo_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_demo_run" ADD CONSTRAINT "connector_demo_run_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_profile" ADD CONSTRAINT "work_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_profile" ADD CONSTRAINT "work_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_profile" ADD CONSTRAINT "work_profile_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

