import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlacementForm, type ClientTest } from "@/components/placement/placement-form";
import { Notice } from "@/components/ui/primitives";
import { serverEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n";
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

  return (
    <>
      <h1 className="text-2xl font-semibold">{test.title}</h1>
      <p>{test.intro}</p>
      <p className="text-sm text-muted">{t.noTimeLimit}</p>
      {ctx && <Notice>{t.loggedInNote}</Notice>}
      {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      <PlacementForm test={clientTest} t={t} action={submitPlacementTest} slug={slug} startToken={issueStartToken(track, serverEnv().BETTER_AUTH_SECRET)} />
    </>
  );
}

export default function PlacementTestPage(props: PageProps<"/niveautest/[track]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <Suspense>
        <Content params={props.params} searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </main>
  );
}
