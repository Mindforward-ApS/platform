"use client";

// Approved platform sidebar (mindforward-platform :3500, Marco Nov 2026; reference: EduSphere): one list, the active
// item filled coral, a promo card at the bottom. Items come from the server (labels from i18n, admin-only items
// already filtered), so this client island only knows the pathname.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BooksIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  ChatCircleIcon,
  FlaskIcon,
  GearSixIcon,
  QuestionIcon,
  SealCheckIcon,
  SquaresFourIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

const ICONS = {
  home: SquaresFourIcon,
  courses: BookOpenIcon,
  sandbox: FlaskIcon,
  certificates: SealCheckIcon,
  calendar: CalendarBlankIcon,
  messages: ChatCircleIcon,
  team: UsersThreeIcon,
  company: BuildingsIcon,
  settings: GearSixIcon,
  help: QuestionIcon,
} as const;

export type NavIcon = keyof typeof ICONS;
export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number;
  /** Extra path prefixes that also mark this item active (e.g. /modul under Mine kurser). */
  also?: string[];
}

function isActive(path: string, item: NavItem) {
  const hit = (p: string) => path === p || path.startsWith(`${p}/`);
  return hit(item.href) || (item.also ?? []).some(hit);
}

export function Item({ item }: { item: NavItem }) {
  const path = usePathname();
  return <ItemView item={item} active={isActive(path, item)} />;
}

function ItemView({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-[10px] px-3 text-[0.8125rem] font-medium transition-colors ${
        active ? "app-nav-active" : "text-pf-white/75 hover:bg-pf-white/[0.06] hover:text-pf-white"
      }`}
    >
      <Icon size={18} weight={active ? "fill" : "regular"} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span
          className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold ${active ? "bg-pf-white text-[var(--accent)]" : "bg-[var(--coral)] text-pf-white"}`}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function NavList({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {items.map((i) => (
        <Item key={i.href} item={i} />
      ))}
    </nav>
  );
}

/** Prerender/loading fallback: same list without reading the pathname (that is runtime data). */
export function StaticNavList({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {items.map((i) => (
        <ItemView key={i.href} item={i} active={false} />
      ))}
    </nav>
  );
}

export function PromoCard({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <div className="relative overflow-hidden rounded-[12px] bg-pf-white/[0.06] p-4 ring-1 ring-pf-white/10">
      <div className="max-w-[9.5rem] text-[0.875rem] leading-snug font-semibold text-pf-white">{title}</div>
      <div className="mt-1 text-[0.6875rem] text-pf-white/60">{body}</div>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[var(--coral)]">
        {cta} <ArrowRightIcon size={11} />
      </Link>
      <BooksIcon size={84} weight="duotone" className="pointer-events-none absolute -right-2 -bottom-3 text-[var(--coral)]" />
      <div className="h-12" />
    </div>
  );
}
