import { Suspense } from "react";
import { HoldListe, type P } from "@/components/platform/hold/HoldListe";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { listTeam } from "@/server/platform/team";

// Mit hold = the approved version H "Liste" (mindforward-platform /hold) on the company's real employees.
// Company admins only (owner/admin of a business org); employees never see colleagues' progress.

function initials(name: string) {
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

async function Content() {
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, "/hold");
  const orgId = ctx.membership.organizationId;
  const [org, team] = await Promise.all([assertBusinessOrg(orgId), listTeam(db(), orgId)]);
  const t = getMessages().orgAdmin;
  const people: P[] = team.map((m, i) => {
    const name = m.row.name || m.row.email;
    return {
      id: i + 1,
      name,
      first: name.split(/\s+/)[0] ?? name,
      initials: initials(name),
      dept: m.row.jobRole ?? "NONE",
      role: t.roles[m.row.role],
      tool: m.row.tracks[0]?.name ?? "–",
      progress: m.progress,
      score: m.row.avgBestScorePct === null ? null : Math.round(m.row.avgBestScorePct),
      // 99 = "Aldrig" in the approved list.
      lastDays: m.lastDays ?? 99,
      state: m.state,
    };
  });
  const deptIds = [...new Set(people.map((p) => p.dept))];
  const depts = deptIds.map((id) => ({ id, name: id === "NONE" ? t.members.assign.noJobRole : t.jobRoles[id as keyof typeof t.jobRoles] }));
  const tools = [...new Set(people.map((p) => p.tool).filter((x) => x !== "–"))];
  return (
    <div data-pf-cream>
      <HoldListe people={people} depts={depts} tools={tools} orgName={org.name} />
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
