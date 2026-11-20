import type { ReactNode } from "react";

// Neutral definition list for plan/status/dates. All values arrive as formatted strings.
// Same row rhythm as the kit's DescriptionList, so it sits cleanly inside a Card.
export function SubscriptionSummary({ rows }: { rows: { label: string; value: ReactNode; testId?: string }[] }) {
  return (
    <dl className="divide-y divide-line" data-testid="subscription-summary">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[200px_1fr] sm:gap-6">
          <dt className="text-body-sm text-ink-muted">{r.label}</dt>
          <dd className="text-body text-ink tabular-nums" data-testid={r.testId}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
