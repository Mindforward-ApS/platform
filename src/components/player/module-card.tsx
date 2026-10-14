import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { CatalogEntry } from "@/server/modules/catalog";
import { num } from "./kit";

const t = getMessages().player.list;

function StatusBadge({ status }: { status: CatalogEntry["status"] }) {
  const label = t.status[status];
  if (status === "PASSED")
    return (
      <Badge tone="success" icon="check">
        {label}
      </Badge>
    );
  if (status === "IN_PROGRESS") return <Badge tone="accent">{label}</Badge>;
  if (status === "ASSIGNED")
    return (
      <Badge tone="neutral" dot>
        {label}
      </Badge>
    );
  return <Badge tone="neutral">{label}</Badge>;
}

/** ModuleCard (design system): the whole card is one link; overline, status, title, one line, mono footer. */
export function ModuleCard({ entry, number }: { entry: CatalogEntry; number: number }) {
  const level = t.level[entry.level as 1 | 2 | 3];
  return (
    <li className="flex">
      <Link
        href={`/modul/${entry.slug}`}
        className="group flex w-full flex-col gap-3 rounded-lg border border-line bg-surface p-6 transition-[box-shadow,border-color] duration-[120ms] ease-out hover:border-line-strong hover:shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-overline text-ink-muted uppercase">
            {level ? `${level} · ` : ""}
            {format(t.moduleNumber, { n: number })}
          </span>
          <StatusBadge status={entry.status} />
        </div>
        <h3 className="text-title-3 text-ink">{entry.title}</h3>
        <p className="line-clamp-2 text-body-sm text-ink-muted">{entry.summary}</p>
        <div className="mt-auto flex items-center gap-4 border-t border-line pt-3 font-mono text-mono text-ink-muted tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={14} />
            {format(t.minutes, { minutes: num(entry.minutes) })}
          </span>
          {entry.steps > 0 && <span>{format(t.steps, { count: num(entry.steps) })}</span>}
          {entry.bestScorePct !== null ? (
            <span className="ml-auto font-sans text-caption text-ink">{format(t.best, { pct: num(entry.bestScorePct) })}</span>
          ) : (
            <Icon name="arrowRight" className="ml-auto text-ink-subtle transition-[transform,color] duration-[120ms] group-hover:translate-x-0.5 group-hover:text-ink" />
          )}
        </div>
        <span className="sr-only">{t.open}</span>
      </Link>
    </li>
  );
}
