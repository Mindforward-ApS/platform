import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { SandboxApp } from "@/components/sandbox/sandbox-app";
import { buildSandboxProps } from "@/server/sandbox/projection";
import { getOrCreateFreePlaySession, type TrackKey } from "@/server/sandbox/service";

// Øvemiljø, ported 1:1 from the real platform's /sandkasse/[track] (2026-11-03): same sandbox app, skins, world and
// event engine. Differences: no login (one demo learner), sessions in .sandbox-data/, no real-connector strip below.
export const metadata: Metadata = { title: "Øvemiljø" };
// Per-request data (the session file), so this route renders at request time (Next 16: blocking route allowed).
export const instant = false;

const TRACKS: Record<string, { key: TrackKey; label: string }> = {
  chatgpt: { key: "CHATGPT", label: "ChatGPT" },
  copilot: { key: "COPILOT", label: "Microsoft 365 Copilot" },
  claude: { key: "CLAUDE", label: "Claude" },
};

// ?tekst=… (from a lesson): put in the composer, never sent. Plain text, capped; anything else is ignored.
const draftParam = z.string().trim().min(1).max(1000);

export default function Page(props: PageProps<"/oevemiljoe/[track]">) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Sandbox params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Sandbox({ params, searchParams }: { params: PageProps<"/oevemiljoe/[track]">["params"]; searchParams: PageProps<"/oevemiljoe/[track]">["searchParams"] }) {
  await connection();
  const { track } = await params;
  const t = TRACKS[track];
  if (!t) notFound();
  const draft = draftParam.safeParse((await searchParams).tekst);
  const session = getOrCreateFreePlaySession(t.key);
  const props = buildSandboxProps(session);
  const tracks = Object.entries(TRACKS).map(([slug, x]) => ({ href: `/oevemiljoe/${slug}`, label: x.label, current: slug === track }));
  return (
    // Fills the main area under the top bar on lg+ (sidebar always visible); only the sandbox's own panes scroll.
    <div data-oevemiljoe className="flex flex-col lg:h-[max(560px,calc(100svh-5.9rem))]">
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-oevemiljoe]) { padding-bottom: 0; } }`}</style>
      <div className="mf-sandbox contents lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:[&>*]:h-auto! lg:[&>*]:min-h-[420px]! lg:[&>*]:flex-1">
        <SandboxApp key={session.id} {...props} tracks={tracks} practice={null} initialDraft={draft.success ? draft.data : undefined} />
      </div>
    </div>
  );
}
