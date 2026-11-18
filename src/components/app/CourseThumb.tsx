import { SparkleIcon, PencilSimpleLineIcon, ChartBarIcon, UsersThreeIcon, EnvelopeSimpleIcon, ShieldCheckIcon, MicrophoneIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";

// Stands in for the reference's illustrated course thumbnails, in our tones only.
const art: Record<string, { icon: typeof SparkleIcon; tone: number }> = {
  "ai-paa-arbejdet": { icon: SparkleIcon, tone: 0 },
  "gode-prompts": { icon: PencilSimpleLineIcon, tone: 1 },
  "mails-og-tilbud": { icon: EnvelopeSimpleIcon, tone: 2 },
  "excel-med-ai": { icon: ChartBarIcon, tone: 3 },
  "data-og-gdpr": { icon: ShieldCheckIcon, tone: 0 },
  "led-et-ai-team": { icon: UsersThreeIcon, tone: 2 },
  "moeder-og-referater": { icon: MicrophoneIcon, tone: 1 },
  "research-med-ai": { icon: MagnifyingGlassIcon, tone: 3 },
};
const tones = [
  { bg: "linear-gradient(135deg, #3d2c28, #201613)", fg: "var(--coral)", dot: "rgb(255 255 255 / 0.12)" },
  { bg: "linear-gradient(135deg, oklch(0.95 0.035 30), oklch(0.9 0.06 28))", fg: "oklch(0.55 0.18 28)", dot: "oklch(0.6 0.15 28 / 0.18)" },
  { bg: "linear-gradient(135deg, oklch(0.72 0.16 32), oklch(0.6 0.18 26))", fg: "#fff", dot: "rgb(255 255 255 / 0.2)" },
  { bg: "linear-gradient(135deg, #4a332c, #2e1f1c)", fg: "oklch(0.85 0.09 40)", dot: "rgb(255 255 255 / 0.1)" },
];

export function CourseThumb({ slug, className = "", size = 44 }: { slug: string; className?: string; size?: number }) {
  const a = art[slug] ?? art["ai-paa-arbejdet"];
  const t = tones[a.tone];
  const Icon = a.icon;
  return (
    <div aria-hidden className={`relative grid place-items-center overflow-hidden ${className}`} style={{ background: t.bg }}>
      <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${t.dot} 1px, transparent 1.5px)`, backgroundSize: "14px 14px" }} />
      <Icon size={size} weight="duotone" className="relative" style={{ color: t.fg }} />
    </div>
  );
}
