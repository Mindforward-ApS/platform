import Link from "next/link";
import { PLACEMENT_TRACKS } from "@/lib/config/placement";
import { getMessages } from "@/lib/i18n";

// P4 (docs/01 § 4.1 step 2): pick the tool. "Ved ikke/flere" → ChatGPT track (can be changed later).
export default function PlacementPickPage() {
  const t = getMessages().placement;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t.pick.title}</h1>
      <p>{t.pick.intro}</p>
      <h2 className="text-lg font-semibold">{t.pick.chooseTrack}</h2>
      <ul className="flex flex-col gap-2">
        {PLACEMENT_TRACKS.map((slug) => (
          <li key={slug}>
            <Link className="block rounded-md border border-border bg-surface px-4 py-3" href={`/niveautest/${slug}`}>
              {t.tracks[slug.toUpperCase() as keyof typeof t.tracks]}
            </Link>
          </li>
        ))}
        <li>
          <Link className="block rounded-md border border-border bg-surface px-4 py-3" href="/niveautest/chatgpt">
            {t.pick.unsure}
            <span className="block text-sm text-muted">{t.pick.unsureHelp}</span>
          </Link>
        </li>
      </ul>
      <p className="text-sm text-muted">{t.pick.disclaimer}</p>
    </main>
  );
}
