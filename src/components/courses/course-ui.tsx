import Link from "next/link";
import { Badge, cx } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// Small building blocks shared by the forløb pages. Tool names are text only: no vendor logos or icons.

export function ToolPicker({ courses, current }: { courses: { slug: string; toolName: string }[]; current: string }) {
  const t = getMessages().courses;
  return (
    <nav aria-label={t.toolPicker} data-testid="tool-picker">
      <ul className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
        {courses.map((c) => {
          const active = c.slug === current;
          return (
            <li key={c.slug}>
              <Link
                href={`/forloeb/${c.slug}`}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex h-9 items-center rounded-full px-4 text-label transition-colors duration-[120ms]",
                  active ? "bg-ink text-on-accent" : "text-ink-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {c.toolName}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Badges in JSON order; they wrap on narrow screens. */
export function LessonBadges({ badges }: { badges: string[] }) {
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <Badge key={b} tone="hint" className="whitespace-normal">
          {b}
        </Badge>
      ))}
    </span>
  );
}

export function ComingSoon() {
  return (
    <Badge tone="neutral" icon="lock">
      {getMessages().courses.comingSoon}
    </Badge>
  );
}

export function CourseDisclaimer({ text }: { text: string }) {
  return (
    <p className="border-t border-line pt-6 text-caption text-ink-subtle" data-testid="course-disclaimer">
      {text}
    </p>
  );
}
