import type { ReactNode } from "react";

// Neutral definition list for plan/status/dates. All values arrive as formatted strings.
export function SubscriptionSummary({ rows }: { rows: { label: string; value: ReactNode; testId?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2" data-testid="subscription-summary">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt>{r.label}</dt>
          <dd data-testid={r.testId}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
