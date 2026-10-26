-- CreateEnum
CREATE TYPE "CourseContentStatus" AS ENUM ('klar', 'kommer-snart');

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolUrl" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "status" "CourseContentStatus" NOT NULL DEFAULT 'kommer-snart',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_level" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "nr" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "nr" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CourseContentStatus" NOT NULL DEFAULT 'kommer-snart',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "nr" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CourseContentStatus" NOT NULL DEFAULT 'kommer-snart',
    "content" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_test" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "passPercent" INTEGER NOT NULL DEFAULT 80,
    "status" "CourseContentStatus" NOT NULL DEFAULT 'kommer-snart',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lesson_completion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_lesson_completion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_slug_key" ON "course"("slug");

-- CreateIndex
CREATE INDEX "course_trackId_idx" ON "course"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "course_level_slug_key" ON "course_level"("slug");

-- CreateIndex
CREATE INDEX "course_level_courseId_sortOrder_idx" ON "course_level"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "course_module_slug_key" ON "course_module"("slug");

-- CreateIndex
CREATE INDEX "course_module_levelId_sortOrder_idx" ON "course_module"("levelId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "course_lesson_slug_key" ON "course_lesson"("slug");

-- CreateIndex
CREATE INDEX "course_lesson_moduleId_sortOrder_idx" ON "course_lesson"("moduleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "course_test_slug_key" ON "course_test"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "course_test_levelId_key" ON "course_test"("levelId");

-- CreateIndex
CREATE INDEX "course_lesson_completion_organizationId_userId_courseId_idx" ON "course_lesson_completion"("organizationId", "userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_lesson_completion_organizationId_userId_lessonId_key" ON "course_lesson_completion"("organizationId", "userId", "lessonId");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_level" ADD CONSTRAINT "course_level_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_module" ADD CONSTRAINT "course_module_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "course_level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lesson" ADD CONSTRAINT "course_lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_test" ADD CONSTRAINT "course_test_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "course_level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lesson_completion" ADD CONSTRAINT "course_lesson_completion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lesson_completion" ADD CONSTRAINT "course_lesson_completion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lesson_completion" ADD CONSTRAINT "course_lesson_completion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lesson_completion" ADD CONSTRAINT "course_lesson_completion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
