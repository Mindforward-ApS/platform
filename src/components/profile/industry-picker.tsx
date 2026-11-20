"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

// Searchable list of user-friendly industries. Each row is a submit button for the server action (works without JS too:
// the search field simply does nothing then).

export function IndustryPicker({
  industries,
  current,
  action,
  t,
}: {
  industries: { id: string; name: string }[];
  current: string | null;
  action: (formData: FormData) => void | Promise<void>;
  t: { search: string; searchPlaceholder: string; empty: string };
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("da");
    return needle ? industries.filter((i) => i.name.toLocaleLowerCase("da").includes(needle)) : industries;
  }, [q, industries]);
  return (
    <div className="flex flex-col gap-4">
      <label className="relative">
        <span className="sr-only">{t.search}</span>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="h-12 w-full rounded-full border border-line-strong/50 bg-surface pr-4 pl-11 text-body text-ink shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus:border-accent focus:shadow-ring"
        />
      </label>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-body-sm text-ink-muted">{t.empty}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="industry-list">
          {shown.map((i) => (
            <li key={i.id}>
              <form action={action}>
                <input type="hidden" name="industryId" value={i.id} />
                <button
                  type="submit"
                  className={cx(
                    "group flex w-full items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3.5 text-left text-label shadow-xs transition-[border-color,box-shadow,background-color] hover:border-accent/50 hover:shadow-sm",
                    i.id === current ? "border-accent bg-accent-soft/40 text-ink" : "border-line text-ink",
                  )}
                >
                  {i.name}
                  <Icon name={i.id === current ? "check" : "arrowRight"} className={cx("shrink-0 transition-transform group-hover:translate-x-0.5", i.id === current ? "text-accent" : "text-ink-subtle")} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
