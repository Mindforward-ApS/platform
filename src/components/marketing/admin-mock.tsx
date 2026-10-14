import { Icon } from "@/components/ui/icons";
import { Badge, type Tone } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { pct } from "./section";

// Illustration of the company admin overview with fictional Nordlys staff (clearly labelled as sample data).
// Mirrors the privacy rule: status, score and certificates only — never prompt texts.

const STATUS: Record<string, { tone: Tone; icon: "check" | "clock" | "dash" }> = {
  PASSED: { tone: "success", icon: "check" },
  IN_PROGRESS: { tone: "accent", icon: "clock" },
  ASSIGNED: { tone: "neutral", icon: "dash" },
};

const FALLBACK = { tone: "neutral" as Tone, icon: "dash" as const };

export function AdminMock() {
  const all = getMessages();
  const t = all.marketing.business.mock;
  const status = all.placement.plan.status;
  const tracks = all.placement.tracks;

  return (
    <figure aria-label={t.figureLabel} className="overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
      <div aria-hidden="true" className="select-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <span className="text-title-3 text-ink">{t.title}</span>
          <Badge tone="neutral">{t.sample}</Badge>
        </div>
        <table className="w-full border-collapse text-left text-body-sm">
          <thead>
            <tr className="bg-sunken text-caption font-semibold tracking-[0.02em] text-ink-muted">
              <th className="px-5 py-2.5 font-semibold">{t.columns.name}</th>
              <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">{t.columns.track}</th>
              <th className="px-4 py-2.5 font-semibold">{t.columns.status}</th>
              <th className="px-5 py-2.5 text-right font-semibold">{t.columns.score}</th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => {
              const look = STATUS[r.status] ?? FALLBACK;
              return (
                <tr key={r.name} className="border-t border-line">
                  <td className="px-5 py-3">
                    <span className="block text-ink">{r.name}</span>
                    <span className="block text-caption text-ink-subtle sm:whitespace-nowrap">{r.role}</span>
                  </td>
                  <td className="hidden px-4 py-3 whitespace-nowrap text-ink-muted sm:table-cell">{tracks[r.track as keyof typeof tracks]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={look.tone} icon={look.icon}>
                      {status[r.status as keyof typeof status]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap text-ink tabular-nums">{r.score === null ? "—" : pct(r.score)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-col gap-2 border-t border-line bg-sunken px-5 py-4">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink">
            <Icon name="file" className="text-ink-muted" />
            {t.report}
            <span className="text-caption whitespace-nowrap text-ink-muted">{t.formats}</span>
          </span>
          <span className="flex items-center gap-2 text-caption text-ink-muted">
            <Icon name="lock" />
            {t.noPrompts}
          </span>
        </div>
      </div>
    </figure>
  );
}
