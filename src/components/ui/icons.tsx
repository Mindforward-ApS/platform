import type { SVGProps } from "react";
import { PHOSPHOR, type PhosphorName } from "@/lib/icons/phosphor-data";

// Mindforward icons (icon system E, Marco 14 Oct 2026): Phosphor glyphs (MIT) on a 256 grid, filled with currentColor.
// `Icon` is the small UI icon (regular weight; bold at 14 px and below). `AppIcon` is the premium tile:
// a soft gradient square with a white filled glyph — for navigation, feature lists, dashboards and empty states.

const MAP = {
  arrowRight: "arrow-right",
  arrowLeft: "arrow-left",
  check: "check",
  x: "x",
  dash: "minus",
  plus: "plus",
  bulb: "lightbulb",
  info: "info",
  alert: "warning-circle",
  shield: "shield-check",
  clock: "clock",
  lock: "lock-simple",
  mail: "envelope-simple",
  user: "user",
  users: "users",
  grid: "squares-four",
  route: "path",
  sandbox: "browser",
  award: "certificate",
  chart: "chart-bar",
  file: "file-text",
  card: "credit-card",
  settings: "gear-six",
  help: "question",
  chat: "chat-circle",
  chats: "chats-circle",
  logout: "sign-out",
  menu: "list",
  chevronDown: "caret-down",
  chevronRight: "caret-right",
  external: "arrow-square-out",
  sparkle: "sparkle",
  target: "target",
  download: "download-simple",
  search: "magnifying-glass",
  trash: "trash",
  send: "paper-plane-right",
  home: "house",
  book: "book-open-text",
  plan: "plan",
  lightning: "lightning",
  graduation: "graduation-cap",
  rocket: "rocket-launch",
  medal: "medal",
  trophy: "trophy",
  building: "buildings",
  robot: "robot",
  share: "share-network",
  link: "link-simple",
  copy: "copy",
  idCard: "identification-card",
} as const satisfies Record<string, PhosphorName>;

export type IconName = keyof typeof MAP;
export type IconWeight = "regular" | "bold" | "fill";

function Glyph({ name, weight }: { name: IconName; weight: IconWeight }) {
  return (
    <>
      {PHOSPHOR[MAP[name]][weight].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </>
  );
}

export function Icon({
  name,
  size = 16,
  weight,
  className = "",
  // Kept for call sites from the stroke-based set; Phosphor glyphs are filled.
  strokeWidth: _strokeWidth,
  ...props
}: { name: IconName; size?: number; weight?: IconWeight } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <Glyph name={name} weight={weight ?? (size <= 14 ? "bold" : "regular")} />
    </svg>
  );
}

export type IconTone = "blue" | "amber" | "mint" | "coral" | "sky" | "slate" | "ink";

const TONES: Record<IconTone, string> = {
  blue: "from-tile-blue-from to-tile-blue-to",
  amber: "from-tile-amber-from to-tile-amber-to",
  mint: "from-tile-mint-from to-tile-mint-to",
  coral: "from-tile-coral-from to-tile-coral-to",
  sky: "from-tile-sky-from to-tile-sky-to",
  slate: "from-tile-slate-from to-tile-slate-to",
  ink: "from-tile-ink-from to-tile-ink-to",
};

/** One color per meaning, so an icon looks the same everywhere. */
const DEFAULT_TONE: Partial<Record<IconName, IconTone>> = {
  home: "blue", grid: "blue", chart: "blue", card: "blue", download: "blue", user: "blue", rocket: "blue",
  book: "amber", route: "amber", lightning: "amber", bulb: "amber", sparkle: "amber",
  plan: "mint", target: "mint", shield: "mint", check: "mint", graduation: "mint",
  award: "coral", medal: "coral", trophy: "coral", trash: "coral", alert: "coral",
  users: "sky", chat: "sky", chats: "sky", mail: "sky", sandbox: "sky", send: "sky", building: "sky",
  lock: "ink", robot: "ink",
};

export function toneFor(name: IconName): IconTone {
  return DEFAULT_TONE[name] ?? "slate";
}

const SIZES = {
  xs: { box: "size-6 rounded-[7px]", glyph: 14 },
  sm: { box: "size-7 rounded-lg", glyph: 16 },
  md: { box: "size-10 rounded-[11px]", glyph: 22 },
  lg: { box: "size-12 rounded-[13px]", glyph: 26 },
  xl: { box: "size-14 rounded-[15px]", glyph: 30 },
} as const;

/** Premium icon tile (icon system E). Decorative: pair it with visible text. */
export function AppIcon({ name, tone, size = "md", className = "" }: { name: IconName; tone?: IconTone; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-linear-to-b text-on-night shadow-tile ${TONES[tone ?? toneFor(name)]} ${s.box} ${className}`}>
      <svg viewBox="0 0 256 256" width={s.glyph} height={s.glyph} fill="currentColor" focusable="false">
        <Glyph name={name} weight="fill" />
      </svg>
    </span>
  );
}
