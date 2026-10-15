import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { RealConnectorsStrip } from "@/components/profile/real-connectors-strip";
import { SandboxApp } from "@/components/sandbox/sandbox-app";
import { getMessages } from "@/lib/i18n";
import { canRunDemo } from "@/server/connectors/demo";
import { practiceConnectorsFor } from "@/server/connectors/practice";
import { PLATFORM_BY_TRACK, recommendationsFor } from "@/server/connectors/service";
import type { TrackKey } from "@/generated/prisma/client";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { buildSandboxProps } from "@/server/sandbox/projection";
import { getOrCreateFreePlaySession, SandboxError } from "@/server/sandbox/service";

// "Fri leg" sandbox per track (docs/04): /sandkasse/chatgpt, /sandkasse/copilot, /sandkasse/claude.
const TRACK_KEYS: Record<string, TrackKey> = { chatgpt: "CHATGPT", copilot: "COPILOT", claude: "CLAUDE", gemini: "GEMINI" };

async function Sandbox({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const trackKey = TRACK_KEYS[track];
  if (!trackKey) notFound();
  const ctx = await guardPage(() => requireUser(), `/sandkasse/${track}`);
  const organizationId = ctx.session.activeOrganizationId;
  if (!organizationId) redirect("/konto");
  const owner = { userId: ctx.user.id, organizationId };
  let session;
  try {
    session = await getOrCreateFreePlaySession(db(), owner, trackKey);
  } catch (err) {
    if (err instanceof SandboxError && err.code === "TRACK_NOT_FOUND") notFound();
    throw err;
  }
  const platform = PLATFORM_BY_TRACK[trackKey];
  const [props, tracks, practice, canDemo, real] = await Promise.all([
    buildSandboxProps(db(), owner, session),
    // Track switcher: names are Track data (descriptive use only, docs/04 § 1), links go to /sandkasse/<track>.
    db().track.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { key: true, displayName: true } }),
    // "Til jeres branche": neutral practice connectors inside the øvemiljø …
    practiceConnectorsFor(db(), owner),
    canRunDemo(db(), organizationId),
    // … and the real, named ones for this assistant below it, clearly outside the øvemiljø.
    platform ? recommendationsFor(db(), owner, platform) : Promise.resolve(null),
  ]);
  const trackLinks = tracks
    .map((tr) => ({ slug: Object.keys(TRACK_KEYS).find((k) => TRACK_KEYS[k] === tr.key), label: tr.displayName }))
    .filter((tr): tr is { slug: string; label: string } => Boolean(tr.slug))
    .map((tr) => ({ href: `/sandkasse/${tr.slug}`, label: tr.label, current: tr.slug === track }));
  return (
    <>
      <SandboxApp key={session.id} {...props} tracks={trackLinks} practice={practice ? { ...practice, canDemo } : null} />
      {platform && real && (
        <RealConnectorsStrip platformName={getMessages().profile.platforms[platform]} platformSlug={track} industry={real.profile.industry?.name ?? ""} names={real.recommended.map((r) => r.name)} />
      )}
    </>
  );
}

export default function SandboxPage(props: PageProps<"/sandkasse/[track]">) {
  return (
    <Suspense>
      <Sandbox params={props.params} />
    </Suspense>
  );
}
