import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/(learner)/konto/actions";
import { Wordmark } from "@/components/ui/brand";
import { Icon, type IconName } from "@/components/ui/icons";
import { getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

// Signed-in app frame (Marco 14 Oct 2026, reference: community-app layout): grouped sidebar on the left,
// content in a rounded panel. Phones get a top bar with the same sidebar as a drawer.

export interface SidebarItem {
  href: string;
  label: string;
  icon?: IconName;
  /** Small colored dot instead of an icon (sandbox tracks). */
  dot?: string;
  exact?: boolean;
}
export interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
}

export function learnerGroups(): SidebarGroup[] {
  const t = getMessages().shell;
  return [
    {
      label: t.learnGroup,
      items: [
        { href: "/hjem", label: t.learner.home, icon: "grid" },
        { href: "/moduler", label: t.learner.modules, icon: "route" },
        { href: "/plan", label: t.learner.plan, icon: "target" },
        { href: "/certifikater", label: t.learner.certificates, icon: "award" },
      ],
    },
    {
      label: t.sandboxGroup,
      items: [
        { href: "/sandkasse/chatgpt", label: t.tracks.chatgpt, dot: "bg-cover-mint-ink" },
        { href: "/sandkasse/copilot", label: t.tracks.copilot, dot: "bg-cover-sky-ink" },
        { href: "/sandkasse/claude", label: t.tracks.claude, dot: "bg-cover-coral-ink" },
      ],
    },
  ];
}

export function companyGroup(): SidebarGroup {
  const t = getMessages();
  const n = t.orgAdmin.nav;
  return {
    label: t.shell.companyGroup,
    items: [
      { href: "/virksomhed", label: n.overview, icon: "chart", exact: true },
      { href: "/virksomhed/medarbejdere", label: n.members, icon: "users" },
      { href: "/virksomhed/rapport", label: n.report, icon: "file" },
      { href: "/virksomhed/data", label: n.data, icon: "shield" },
      { href: "/virksomhed/databehandleraftale", label: n.dpa, icon: "lock" },
    ],
  };
}

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

async function UserChip() {
  const ctx = await getAuthContext().catch(() => null);
  if (!ctx) return null;
  const { name, email } = ctx.user;
  return (
    <Link href="/konto" className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-surface">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-accent-ink">{initials(name, email)}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-label text-ink">{name || email}</span>
        {name && <span className="truncate text-caption text-ink-subtle">{email}</span>}
      </span>
    </Link>
  );
}

function SidebarContent({ groups, idPrefix }: { groups: SidebarGroup[]; idPrefix: string }) {
  const t = getMessages();
  return (
    <div className="flex min-h-full flex-col gap-6 px-3 pt-5 pb-3">
      <Link href="/hjem" className="self-start rounded-sm px-2.5" aria-label={t.brand}>
        <Wordmark size={18} />
      </Link>
      <form action="/hjaelp" role="search" className="relative px-0.5">
        <label htmlFor={`${idPrefix}-search`} className="sr-only">
          {t.shell.searchLabel}
        </label>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle" />
        <input
          id={`${idPrefix}-search`}
          name="q"
          type="search"
          placeholder={t.shell.searchPlaceholder}
          className="h-9 w-full rounded-md border border-line bg-surface pr-3 pl-9 text-body-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:shadow-ring focus:outline-none"
        />
      </form>
      <nav aria-label={t.shell.mainNav} className="flex flex-col gap-6">
        {groups.map((g, i) => (
          <div key={g.label ?? i} className="flex flex-col gap-0.5">
            {g.label && <p className="px-2.5 pb-1.5 text-overline text-ink-subtle uppercase">{g.label}</p>}
            {g.items.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact} variant="sidebar">
                {item.dot ? (
                  <span className="grid size-4 place-items-center">
                    <span className={`nav-dot size-2 rounded-full ${item.dot}`} />
                  </span>
                ) : (
                  item.icon && <Icon name={item.icon} />
                )}
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <NavLink href="/hjaelp" variant="sidebar">
          <Icon name="help" />
          {t.shell.learner.help}
        </NavLink>
        <div className="mt-2 flex items-center gap-1">
          <Suspense fallback={<span className="h-11 flex-1" />}>
            <UserChip />
          </Suspense>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={t.auth.logout}
              title={t.auth.logout}
              className="grid size-9 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** The whole signed-in frame: sidebar + rounded content panel. */
export function AppFrame({ groups = learnerGroups(), children }: { groups?: SidebarGroup[]; children: ReactNode }) {
  const t = getMessages();
  return (
    <div className="flex flex-1 flex-col bg-bg lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#indhold" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md">
        {t.shell.skipToContent}
      </a>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto lg:block">
        <SidebarContent groups={groups} idPrefix="sidebar" />
      </aside>
      <MobileNav
        openLabel={t.shell.openMenu}
        closeLabel={t.shell.closeMenu}
        bar={
          <Link href="/hjem" aria-label={t.brand} className="rounded-sm">
            <Wordmark size={18} />
          </Link>
        }
      >
        <SidebarContent groups={groups} idPrefix="drawer" />
      </MobileNav>
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div id="indhold" className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-surface lg:min-h-[calc(100dvh-1rem)] lg:rounded-xl lg:border lg:border-line lg:shadow-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
