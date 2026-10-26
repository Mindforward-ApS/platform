import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SandboxApp } from "@/components/sandbox/sandbox-app";
import { Icon } from "@/components/ui/icons";
import { Card, Notice } from "@/components/ui/primitives";
import type { TrackKey } from "@/generated/prisma/client";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { canRunDemo } from "@/server/connectors/demo";
import { practiceConnectorsFor } from "@/server/connectors/practice";
import { db } from "@/server/db";
import { loadFeatureFile } from "@/server/sandbox/features";
import { buildSandboxProps } from "@/server/sandbox/projection";
import { getOrCreateFreePlaySession, SandboxError } from "@/server/sandbox/service";

// One feature of the real tool, opened from the øvemiljø menu in a new tab: what it does, where it is in the tool
// (real menu names as explanatory text), and the øvemiljø opened straight on the feature to practise it.

const TRACK_KEYS: Record<string, TrackKey> = { chatgpt: "CHATGPT", copilot: "COPILOT", claude: "CLAUDE" };

async function FeaturePage({ params }: { params: Promise<{ track: string; id: string }> }) {
  const { track, id } = await params;
  const trackKey = TRACK_KEYS[track];
  const guide = trackKey ? loadFeatureFile(track) : null;
  const feature = guide?.features.find((f) => f.id === id);
  if (!trackKey || !guide || !feature) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/sandkasse/${track}/funktion/${id}`);
  const owner = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  let session;
  try {
    session = await getOrCreateFreePlaySession(db(), owner, trackKey);
  } catch (err) {
    if (err instanceof SandboxError && err.code === "TRACK_NOT_FOUND") notFound();
    throw err;
  }
  const [props, practice, canDemo, trackRow] = await Promise.all([
    buildSandboxProps(db(), owner, session),
    practiceConnectorsFor(db(), owner),
    canRunDemo(db(), owner.organizationId),
    db().track.findUnique({ where: { key: trackKey }, select: { displayName: true } }),
  ]);
  const t = getMessages().sandboxGuide;
  const tool = trackRow?.displayName ?? track;
  const date = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(guide.checked));
  const index = guide.features.findIndex((f) => f.id === id);

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
      <Link href={`/sandkasse/${track}`} className="inline-flex items-center gap-1.5 self-start text-body-sm text-ink-muted hover:text-ink">
        <Icon name="arrowLeft" size={14} />
        {t.back}
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-overline text-ink-subtle uppercase">
          {format(t.eyebrow, { tool })} · {index + 1}/{guide.features.length}
        </p>
        <h1 className="text-title-1 text-ink">{feature.label}</h1>
        <p className="max-w-3xl text-body-lg text-ink-muted">{feature.what}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={format(t.inTool, { tool })}>
          <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-body text-ink marker:text-ink-subtle" data-testid="feature-in-tool">
            {feature.inTool.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <p className="text-caption text-ink-subtle">{format(t.checked, { tool, date })}</p>
        </Card>
        <Card title={t.tryIt}>
          {feature.practice === "ready" ? (
            <>
              {feature.tryIt && <p className="text-body text-ink">{feature.tryIt}</p>}
              <p className="text-body-sm text-ink-muted">{t.tryItReady}</p>
            </>
          ) : (
            <Notice tone="hint" data-testid="feature-soon">
              {t.tryItSoon}
            </Notice>
          )}
        </Card>
      </div>

      <div className="mf-sandbox flex h-[760px] min-h-0 flex-col overflow-hidden rounded-card border border-line [&>*]:h-full! [&>*]:min-h-0!" data-testid="feature-sandbox">
        <SandboxApp key={session.id} {...props} initialConcept={feature.concept} practice={practice ? { ...practice, canDemo } : null} />
      </div>
    </main>
  );
}

export default function SandboxFeaturePage(props: PageProps<"/sandkasse/[track]/funktion/[id]">) {
  return (
    <Suspense>
      <FeaturePage params={props.params} />
    </Suspense>
  );
}
