import type { Metadata } from "next";
import { Suspense } from "react";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Kom i gang" };

// Onboarding preview (Marco 2026-11-11). ?type=privat or ?type=virksomhed skips the first choice.
// The query is read inside Suspense so the rest of the page can still prerender.
async function WithType({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <Onboarding initial={type === "privat" || type === "virksomhed" ? type : undefined} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  return (
    <Suspense fallback={<Onboarding />}>
      <WithType searchParams={searchParams} />
    </Suspense>
  );
}
