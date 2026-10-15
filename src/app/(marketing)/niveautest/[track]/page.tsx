import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlacementForm, type ClientTest } from "@/components/placement/placement-form";
import { Icon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/primitives";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { getPlacementTest, trackFromSlug } from "@/server/placement/content";
import { issueStartToken } from "@/server/placement/tokens";
import { submitPlacementTest } from "./actions";

const ERRORS = { mangler: "incomplete", hurtig: "tooFast", udloebet: "expired", graense: "rateLimited", generel: "generic" } as const;

async function Content({ params, searchParams }: { params: Promise<{ track: string }>; searchParams: Promise<{ fejl?: string }> }) {
  const [{ track: slug }, sp] = await Promise.all([params, searchParams]);
  const track = trackFromSlug(slug);
  if (!track) notFound();
  await connection();
  const t = getMessages().placement.test;
  const test = getPlacementTest(track);
  // Never ship the answer key to the browser.
  const { areas: _areas, questions, ...rest } = test;
  const clientTest: ClientTest = { ...rest, questions: questions.map(({ correct: _correct, ...q }) => q) };
  const ctx = await getAuthContext();
  const errorKey = sp.fejl && sp.fejl in ERRORS ? ERRORS[sp.fejl as keyof typeof ERRORS] : undefined;

  const tracks = getMessages().placement.tracks;
  return (
    <>
      {/* Two columns from 1024px: the intro stays in view on the left while the questions scroll on the right. */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
        <header className="flex animate-rise flex-col gap-4">
          <p className="text-overline text-accent uppercase">{format(t.eyebrow, { track: tracks[track] })}</p>
          <h1 className="text-title-1 text-ink">{test.title}</h1>
          <p className="text-body-lg text-pretty text-ink-muted">{test.intro}</p>
          <p className="flex items-center gap-1.5 text-body-sm text-ink-muted">
            <Icon name="clock" />
            {t.noTimeLimit}
          </p>
        </header>
        {ctx && <Notice>{t.loggedInNote}</Notice>}
        {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      </div>
      <div className="min-w-0 animate-rise [animation-delay:120ms]">
        <PlacementForm
          test={clientTest}
          t={t}
          action={submitPlacementTest}
          slug={slug}
          startToken={issueStartToken(track, serverEnv().BETTER_AUTH_SECRET)}
        />
      </div>
    </>
  );
}

export default function PlacementTestPage(props: PageProps<"/niveautest/[track]">) {
  return (
    <main className="mf-spots mx-auto grid w-full max-w-app flex-1 grid-cols-1 content-start gap-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16 lg:px-10">
      <Suspense>
        <Content params={props.params} searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </main>
  );
}
