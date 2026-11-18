import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingNy } from "./OnboardingNy";

export const metadata: Metadata = { title: "Kom i gang" };

// Onboarding round 2 (Marco 2026-11-11). ?type=privat or ?type=virksomhed skips the first choice.
async function WithType({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <OnboardingNy initial={type === "privat" || type === "virksomhed" ? type : undefined} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  return (
    <Suspense fallback={<OnboardingNy />}>
      <WithType searchParams={searchParams} />
    </Suspense>
  );
}
