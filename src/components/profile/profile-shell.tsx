import type { ReactNode } from "react";
import { cx, StepSegments } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { skipProfileStep } from "@/app/(learner)/profil/actions";

// Frame for the work-profile steps: progress (3 steps), content, and room for the skip action.

export const PROFILE_STEPS = 3;

export function ProfileShell({ step, align = "start", children }: { step: number; align?: "start" | "center"; children: ReactNode }) {
  const t = getMessages().profile;
  const label = format(t.progress, { step, total: PROFILE_STEPS });
  return (
    <main className="mf-spots mf-stagger flex w-full max-w-wide flex-1 flex-col gap-8 px-4 pt-10 pb-16 sm:px-6 lg:px-12">
      <div className={cx("flex w-full flex-col gap-2", align === "center" ? "mx-auto max-w-xl" : "max-w-sm")}>
        <p className="text-caption text-ink-subtle">{label}</p>
        <StepSegments current={step} total={PROFILE_STEPS} label={label} />
      </div>
      {children}
    </main>
  );
}

export function SkipButton() {
  return (
    <form action={skipProfileStep}>
      <button type="submit" className="text-body-sm text-ink-muted underline decoration-line-strong/50 underline-offset-[3px] hover:text-ink">
        {getMessages().profile.skip}
      </button>
    </form>
  );
}
