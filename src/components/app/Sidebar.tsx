"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFourIcon, BookOpenIcon, CalendarBlankIcon, FlaskIcon, SealCheckIcon, UsersThreeIcon, ChatCircleIcon, QuestionIcon, GearSixIcon, BooksIcon, ArrowRightIcon,
} from "@phosphor-icons/react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";
import { useRole, type Role } from "@/lib/role";

// Reference: EduSphere sidebar. One list, active item filled (their blue → our coral), promo card at the bottom.
export const main = [
  { href: "/", label: "Oversigt", icon: SquaresFourIcon },
  { href: "/kurser", label: "Mine kurser", icon: BookOpenIcon },
  { href: "/oevemiljoe", label: "Øvemiljø", icon: FlaskIcon },
  { href: "/beviser", label: "Kursusbeviser", icon: SealCheckIcon },
  { href: "/plan", label: "Kalender", icon: CalendarBlankIcon },
  // Marco 2026-11-11: Community in place of Beskeder.
  { href: "/community", label: "Community", icon: ChatCircleIcon },
  { href: "/hold", label: "Mit hold", icon: UsersThreeIcon, roles: ["admin"] as Role[] },
  { href: "/indstillinger", label: "Indstillinger", icon: GearSixIcon },
  { href: "/hjaelp", label: "Hjælp", icon: QuestionIcon },
];
export const foot: typeof main = [];
// The menu for one role: items with `roles` only show for those roles.
export function useMenu() {
  const r = useRole();
  return main.filter((i) => !("roles" in i) || !i.roles || i.roles.includes(r));
}

export function Item({ href, label, icon: Icon, badge }: { href: string; label: string; icon: typeof BookOpenIcon; badge?: number; roles?: Role[] }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex h-10 items-center gap-3 rounded-[10px] px-3 text-[0.8125rem] font-medium transition-colors ${
        active ? "app-nav-active" : "text-white/75 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon size={18} weight={active ? "fill" : "regular"} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold ${active ? "bg-white text-[var(--accent)]" : "bg-[var(--coral)] text-white"}`}>{badge}</span>
      ) : null}
    </Link>
  );
}

export function PromoCard() {
  return (
    <div className="relative overflow-hidden rounded-[12px] bg-white/[0.06] p-4 ring-1 ring-white/10">
      <div className="text-[0.875rem] font-semibold leading-snug text-white">Små skridt giver<br />store fremskridt</div>
      <div className="mt-1 text-[0.6875rem] text-white/60">10 minutter om dagen er nok.</div>
      <Link href="/plan" className="mt-3 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[var(--coral)]">Planlæg din uge <ArrowRightIcon size={11} /></Link>
      <BooksIcon size={84} weight="duotone" className="pointer-events-none absolute -bottom-3 -right-2 text-[var(--coral)]" />
      <div className="h-12" />
    </div>
  );
}

export function Sidebar() {
  const menu = useMenu();
  return (
    <aside className="app-side sticky top-0 hidden h-svh w-60 shrink-0 flex-col rounded-r-[18px] p-3 pt-6 lg:flex">
      <div className="px-2 pb-6 pt-3">
        <MindforwardLogo size={26} />
        <div className="mt-1 pl-0.5 text-[0.625rem] text-white/50">Lær · Øv · Kom videre</div>
      </div>
      <nav className="flex flex-col gap-1">{menu.map((i) => <Item key={i.href} {...i} />)}</nav>
      <div className="mt-auto pt-4"><PromoCard /></div>
    </aside>
  );
}
