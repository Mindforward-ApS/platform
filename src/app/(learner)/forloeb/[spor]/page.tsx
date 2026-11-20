import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KursusSide } from "@/components/platform/kurser/KursusSide";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getCourseOverview, isCourseSlug } from "@/server/courses/service";
import { db } from "@/server/db";
import { courseView } from "@/server/platform/views";

// Course page: /forloeb/chatgpt, /forloeb/claude, /forloeb/copilot, in the approved platform course layout.
// Every figure is computed from the data.

async function Overview({ params }: { params: Promise<{ spor: string }> }) {
  const { spor } = await params;
  if (!isCourseSlug(spor)) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/forloeb/${spor}`);
  const owner = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  const course = await getCourseOverview(db(), owner, spor);
  if (!course) notFound();
  return <KursusSide course={courseView(course)} disclaimer={course.disclaimer} />;
}

export default function CourseOverviewPage(props: PageProps<"/forloeb/[spor]">) {
  return (
    <Suspense>
      <Overview params={props.params} />
    </Suspense>
  );
}
