import { readFileSync } from "node:fs";
import { Prisma, type CourseContentStatus, type PrismaClient, type TrackKey } from "@/generated/prisma/client";
import { courseFileSchema, type CourseFile, type CourseStatusJson } from "@/lib/schemas/course";
import { seedTracks } from "@/server/content/seed";

// `pnpm db:seed:forloeb`: puts content/forloeb/forloeb.json into the DB. Idempotent: every row is upserted on its JSON id
// (stored in `slug`), so running it twice creates no duplicates. Order follows the JSON. Never runs in the build.
// Rows that disappear from the JSON are left alone (nothing is deleted).

export const COURSE_FILE = "content/forloeb/forloeb.json";

const TRACK_BY_COURSE: Record<CourseFile["tracks"][number]["id"], TrackKey> = { chatgpt: "CHATGPT", claude: "CLAUDE", copilot: "COPILOT" };
const STATUS: Record<CourseStatusJson, CourseContentStatus> = { klar: "READY", "kommer-snart": "COMING_SOON" };

export function loadCourseFile(path = COURSE_FILE): CourseFile {
  return courseFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export async function seedCourses(db: PrismaClient, file: CourseFile = loadCourseFile()) {
  // Courses hang on the existing Track rows; make sure they exist (same idempotent upsert as `pnpm db:seed`).
  await seedTracks(db);
  const counts = { courses: 0, levels: 0, modules: 0, lessons: 0, tests: 0 };

  for (const [ci, c] of file.tracks.entries()) {
    const track = await db.track.findUniqueOrThrow({ where: { key: TRACK_BY_COURSE[c.id] }, select: { id: true } });
    const courseData = { trackId: track.id, toolName: c.toolName, toolUrl: c.toolUrl, headline: c.headline, disclaimer: c.disclaimer, status: STATUS[c.status], sortOrder: ci };
    const course = await db.course.upsert({ where: { slug: c.id }, create: { slug: c.id, ...courseData }, update: courseData, select: { id: true } });
    counts.courses++;

    for (const [li, l] of c.levels.entries()) {
      const levelData = { courseId: course.id, nr: l.nr, name: l.name, title: l.title, outcome: l.outcome, sortOrder: li };
      const level = await db.courseLevel.upsert({ where: { slug: l.id }, create: { slug: l.id, ...levelData }, update: levelData, select: { id: true } });
      counts.levels++;

      const testData = { levelId: level.id, title: l.test.title, description: l.test.description, minutes: l.test.minutes, passPercent: l.test.passPercent, status: STATUS[l.test.status] };
      await db.courseTest.upsert({ where: { slug: l.test.id }, create: { slug: l.test.id, ...testData }, update: testData });
      counts.tests++;

      for (const [mi, m] of l.modules.entries()) {
        const moduleData = { levelId: level.id, nr: m.nr, title: m.title, description: m.description, status: STATUS[m.status], sortOrder: mi };
        const mod = await db.courseModule.upsert({ where: { slug: m.id }, create: { slug: m.id, ...moduleData }, update: moduleData, select: { id: true } });
        counts.modules++;

        for (const [xi, x] of m.lessons.entries()) {
          // Lessons without text store SQL NULL (Prisma.DbNull), also when an update removes the text again.
          const lessonData = {
            moduleId: mod.id,
            nr: x.nr,
            title: x.title,
            minutes: x.minutes,
            badges: x.badges,
            status: STATUS[x.status],
            content: x.content ? (x.content as Prisma.InputJsonObject) : Prisma.DbNull,
            sortOrder: xi,
          };
          await db.courseLesson.upsert({ where: { slug: x.id }, create: { slug: x.id, ...lessonData }, update: lessonData });
          counts.lessons++;
        }
      }
    }
  }
  return counts;
}

