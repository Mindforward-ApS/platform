"use client";

import { useActionState, type ReactNode } from "react";
import { Notice } from "@/components/ui/primitives";

// Form bound to a server action that returns a small state ({ ok } / { error }) — messages come from i18n on the
// server, so no user-facing text travels through URLs.

export interface FormState {
  ok?: string;
  error?: string;
  /** Extra text shown with `ok`, e.g. a freshly created join link (shown once). */
  detail?: string;
}

export function ActionForm({
  action,
  children,
  className = "flex flex-col gap-4",
  testId,
}: {
  action: (state: FormState | null, formData: FormData) => Promise<FormState | null>;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className} data-testid={testId}>
      {(state?.error || state?.ok) && (
        <div className="col-span-full w-full basis-full">
          {state.error && <Notice tone="error">{state.error}</Notice>}
          {state.ok && (
            <Notice tone="success">
              {state.ok}
              {state.detail && (
                <code className="mt-2 block rounded-sm border border-line bg-surface px-3 py-2 font-mono text-mono break-all text-ink" data-testid="action-detail">
                  {state.detail}
                </code>
              )}
            </Notice>
          )}
        </div>
      )}
      {children}
    </form>
  );
}
