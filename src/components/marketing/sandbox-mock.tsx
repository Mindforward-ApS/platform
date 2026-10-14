import { Icon, type IconName } from "@/components/ui/icons";
import { Badge, cx } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// Illustration of the practice environment (own visual identity, generic menu terms only — docs/04 § 3).
// Nordlys Logistik data is fictional; the fixed sandbox disclaimer is shown on the frame.

export function SandboxMock() {
  const all = getMessages();
  const t = all.marketing.sandbox.mock;
  const s = all.sandbox;
  const nav: [IconName, string][] = [
    ["chat", s.terms.chat],
    ["mail", s.terms.mail],
    ["clock", s.terms.calendar],
    ["file", s.terms.files],
    ["users", s.terms.crm],
    ["grid", s.terms.sheet],
  ];

  return (
    <figure aria-label={t.figureLabel} className="overflow-hidden rounded-xl border border-night-line bg-surface shadow-lg">
      <div aria-hidden="true" className="select-none">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-sunken px-4 py-3">
          <span className="truncate text-label text-ink">{s.company}</span>
          <Badge tone="neutral" icon="sandbox">
            {s.title}
          </Badge>
        </div>
        <div className="grid md:grid-cols-[148px_minmax(0,1fr)_minmax(0,1.15fr)]">
          <ul className="hidden flex-col gap-0.5 border-r border-line p-2 md:flex">
            {nav.map(([icon, label], i) => (
              <li
                key={label}
                className={cx("flex h-8 items-center gap-2 rounded-sm px-2 text-body-sm", i === 1 ? "bg-accent-soft font-[550] text-accent-ink" : "text-ink-muted")}
              >
                <Icon name={icon} />
                {label}
              </li>
            ))}
          </ul>

          <div className="border-b border-line md:border-r md:border-b-0">
            <p className="border-b border-line px-4 py-2.5 text-overline text-ink-subtle uppercase">{t.inbox}</p>
            <ul className="divide-y divide-line">
              {t.mails.map((m, i) => (
                <li key={m.subject} className={cx("flex flex-col gap-0.5 px-4 py-3", i === 0 && "bg-accent-soft/50")}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cx("truncate text-body-sm", i === 0 ? "font-semibold text-ink" : "text-ink")}>{m.from}</span>
                    <span className="shrink-0 font-mono text-mono text-ink-subtle tabular-nums">{m.time}</span>
                  </span>
                  <span className="truncate text-body-sm text-ink-muted">{m.subject}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <div className="ml-auto max-w-[85%] rounded-lg rounded-br-xs bg-accent-soft px-3.5 py-2.5 text-body-sm text-ink">{t.userMessage}</div>
            <div className="flex flex-col gap-2">
              <Badge tone="neutral" icon="sparkle" className="self-start">
                {s.modelLabel}
              </Badge>
              <ul className="flex flex-col gap-1.5 text-body-sm text-ink">
                {t.answer.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-subtle" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto flex h-10 items-center justify-between gap-3 rounded-sm border border-line-strong px-3 text-body-sm text-ink-subtle">
              <span className="truncate">{s.chat.placeholder}</span>
              <Icon name="send" className="text-ink-muted" />
            </div>
          </div>
        </div>
        <p className="border-t border-line bg-sunken px-4 py-2.5 text-caption text-ink-muted">{s.disclaimer}</p>
      </div>
    </figure>
  );
}
