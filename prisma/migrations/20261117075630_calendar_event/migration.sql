-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('LESSON', 'PRACTICE', 'MEETING');

-- CreateTable
CREATE TABLE "calendar_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_event_userId_startsAt_idx" ON "calendar_event"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "calendar_event_organizationId_idx" ON "calendar_event"("organizationId");

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
