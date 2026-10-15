import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";

// Below the øvemiljø, clearly outside it (Marco 15 Oct 2026, "begge dele"): the REAL connectors for this assistant and
// industry, with a link to the full list. Vendor names only appear here, never inside the sandbox UI (docs/04 § 3).

export function RealConnectorsStrip({ platformName, platformSlug, industry, names }: { platformName: string; platformSlug: string; industry: string; names: string[] }) {
  const t = getMessages().profile.realStrip;
  if (names.length === 0) return null;
  return (
    <aside className="mx-auto mt-4 mb-6 flex w-full max-w-wide flex-col gap-3 rounded-2xl border border-dashed border-line-strong/50 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:gap-5 lg:mx-0" data-testid="real-connectors" aria-label={t.label}>
      <Badge icon="external">{t.label}</Badge>
      <p className="flex-1 text-body-sm text-ink-muted">
        {format(t.body, { platform: platformName, industry: industry.toLocaleLowerCase("da") })} <span className="text-ink">{names.slice(0, 5).join(", ")}</span>
        {names.length > 5 && " …"}
      </p>
      <Link href={`/profil/anbefalinger?platform=${platformSlug}`} className="inline-flex shrink-0 items-center gap-1 text-body-sm font-medium text-accent underline decoration-accent/30 underline-offset-[3px] hover:text-accent-hover">
        {t.cta}
        <Icon name="arrowRight" size={14} />
      </Link>
    </aside>
  );
}
