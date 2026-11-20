import type { Metadata } from "next";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { subprocessorsFileSchema } from "@/lib/schemas/legal";
import raw from "../../../../content/legal/subprocessors.json";

// Public sub-processor list (launch gate J6, docs/10). Data lives in content/legal/subprocessors.json.

const file = subprocessorsFileSchema.parse(raw);

export const metadata: Metadata = { title: getMessages().placement.legal.subprocessors.title };

export default function Page() {
  const legal = getMessages().placement.legal;
  const t = legal.subprocessors;
  const anyUnverified = file.subprocessors.some((s) => !s.verified);
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="flex max-w-read flex-col gap-4">
        <div role="note" className="flex items-center gap-2 self-start rounded-sm bg-hint-soft px-3 py-1.5 text-label text-hint">
          <Icon name="alert" />
          <span data-testid="legal-draft">{legal.draftBanner}</span>
        </div>
        <h1 className="text-title-1 text-ink sm:text-display">{t.title}</h1>
        <p className="text-body-sm text-ink-muted">{format(legal.versionLine, { version: file.version, date: formatDateDa(new Date(file.updated)) })}</p>
        <p className="text-body text-ink sm:text-body-lg">{t.lead}</p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[56rem] border-collapse text-left text-body-sm">
          <caption className="sr-only">{t.tableCaption}</caption>
          <thead className="bg-sunken text-label text-ink-muted">
            <tr>
              {Object.values(t.columns).map((c) => (
                <th key={c} scope="col" className="px-4 py-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {file.subprocessors.map((s) => (
              <tr key={s.name} className="border-t border-line align-top">
                <th scope="row" className="px-4 py-3 font-medium text-ink">
                  {s.name}
                </th>
                <td className="px-4 py-3 text-ink">{s.purpose}</td>
                <td className="px-4 py-3 text-ink-muted">{s.data}</td>
                <td className="px-4 py-3 text-ink">{s.location}</td>
                <td className="px-4 py-3 text-ink-muted">{s.transfer}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.verified ? "success" : "neutral"}>{s.verified ? t.verified : t.unverified}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex max-w-read flex-col gap-3 text-body-sm text-ink-muted">
        {anyUnverified && <p>{t.unverifiedNote}</p>}
        <p>{t.changes}</p>
      </div>
    </main>
  );
}
