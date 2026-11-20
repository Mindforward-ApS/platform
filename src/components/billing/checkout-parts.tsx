import { Badge, cx } from "@/components/ui/primitives";

// Presentational pieces for the checkout page. All amounts arrive formatted from config/DB.

/** The chosen plan as a selected choice card (B2C has one plan; the card shows it is the one being bought). */
export function PlanChoice({ name, amount, unit, selectedLabel }: { name: string; amount: string; unit: string; selectedLabel: string }) {
  return (
    <div aria-current="true" className="flex items-start gap-4 rounded-lg border border-accent bg-surface p-6 shadow-ring">
      <span aria-hidden="true" className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-accent">
        <span className="size-2 rounded-full bg-on-accent" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-title-3 text-ink">{name}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-title-1 text-ink">{amount}</span>
            <span className="text-body-sm text-ink-muted">{unit}</span>
          </p>
        </div>
        <Badge tone="accent" icon="check" className="self-start">
          {selectedLabel}
        </Badge>
      </div>
    </div>
  );
}

/** One label/value row in the order summary. */
export function CheckoutRow({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className={cx("min-w-0 text-right text-body-sm text-ink [overflow-wrap:anywhere]", numeric && "tabular-nums")}>{value}</dd>
    </div>
  );
}
