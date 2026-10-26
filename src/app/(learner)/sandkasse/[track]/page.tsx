import { notFound } from "next/navigation";
import { z } from "zod";
import { Suspense } from "react";
import { RealConnectorsStrip } from "@/components/profile/real-connectors-strip";
import { SandboxApp } from "@/components/sandbox/sandbox-app";
import { getMessages } from "@/lib/i18n";
import { canRunDemo } from "@/server/connectors/demo";
import { practiceConnectorsFor } from "@/server/connectors/practice";
import { PLATFORM_BY_TRACK, recommendationsFor } from "@/server/connectors/service";
import type { TrackKey } from "@/generated/prisma/client";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { buildSandboxProps } from "@/server/sandbox/projection";
import { getOrCreateFreePlaySession, SandboxError } from "@/server/sandbox/service";

// "Fri leg" sandbox per track (docs/04): /sandkasse/chatgpt, /sandkasse/copilot, /sandkasse/claude.
const TRACK_KEYS: Record<string, TrackKey> = { chatgpt: "CHATGPT", copilot: "COPILOT", claude: "CLAUDE", gemini: "GEMINI" };

// ?tekst=… (from a forløb lesson): put in the composer, never sent. Plain text, capped; anything else is ignored.
const draftParam = z.string().trim().min(1).max(1000);

async function Sandbox({ params, searchParams }: { params: Promise<{ track: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { track } = await params;
  const draft = draftParam.safeParse((await searchParams).tekst);
  const trackKey = TRACK_KEYS[track];
  if (!trackKey) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/sandkasse/${track}`);
  const organizationId = ctx.membership.organizationId;
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
    // Desktop: the sandbox and the strip below share exactly the space under the top bar, so the app panel never
    // scrolls on this page (only the sandbox's own panes do). The sandbox's inner UI is untouched; only its outer
    // box is told to fill the remaining height instead of a fixed 100dvh - 5rem.
    <div className="mf-sandbox-page contents lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      {/* mf-sandbox: the app's v3 kit styles (`app:` variant) stop here; the sandbox keeps its own look. */}
      <div className="mf-sandbox contents lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:[&>*]:h-auto! lg:[&>*]:min-h-[420px]! lg:[&>*]:flex-1">
        <SandboxApp key={session.id} {...props} tracks={trackLinks} practice={practice ? { ...practice, canDemo } : null} initialDraft={draft.success ? draft.data : undefined} />
      </div>
      {platform && real && (
        <RealConnectorsStrip platformName={getMessages().profile.platforms[platform]} platformSlug={track} industry={real.profile.industry?.name ?? ""} names={real.recommended.map((r) => r.name)} />
      )}
    </div>
  );
}

export default function SandboxPage(props: PageProps<"/sandkasse/[track]">) {
  return (
    <Suspense>
      <Sandbox params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
