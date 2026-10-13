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
  className = "flex flex-col gap-3",
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
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && (
        <Notice>
          {state.ok}
          {state.detail && (
            <code className="mt-1 block break-all" data-testid="action-detail">
              {state.detail}
            </code>
          )}
        </Notice>
      )}
      {children}
    </form>
  );
}
