import { getMessages } from "@/lib/i18n";

export default function HomePage() {
  const t = getMessages().home;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-4xl font-semibold">{t.heading}</h1>
      <p className="text-muted">{t.tagline}</p>
    </main>
  );
}
