import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/(learner)/konto/actions";
import { Wordmark } from "@/components/ui/brand";
import { AppIcon, Icon, type IconName, type IconTone } from "@/components/ui/icons";
import { getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { MobileNav } from "./mobile-nav";
import { BrandIcon, type BrandKey } from "@/components/ui/brand-icon";
import { NavLink } from "./nav-link";

// Signed-in app frame (Marco 14 Oct 2026, reference: community-app layout): grouped sidebar on the left,
// content in a rounded panel. Phones get a top bar with the same sidebar as a drawer.

export interface SidebarItem {
  href: string;
  label: string;
  icon?: IconName;
  /** App-icon tile color. */
  tone?: IconTone;
  /** Small colored dot instead of an icon. */
  dot?: string;
  /** Vendor mark (sandbox tracks). */
  brand?: BrandKey;
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
        { href: "/hjem", label: t.learner.home, icon: "home", tone: "blue" },
        { href: "/moduler", label: t.learner.modules, icon: "book", tone: "amber" },
        { href: "/plan", label: t.learner.plan, icon: "plan", tone: "mint" },
        { href: "/certifikater", label: t.learner.certificates, icon: "award", tone: "coral" },
      ],
    },
    {
      label: t.sandboxGroup,
      items: [
        { href: "/sandkasse/chatgpt", label: t.tracks.chatgpt, brand: "chatgpt" },
        { href: "/sandkasse/copilot", label: t.tracks.copilot, brand: "copilot" },
        { href: "/sandkasse/claude", label: t.tracks.claude, brand: "claude" },
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
      { href: "/virksomhed", label: n.overview, icon: "chart", exact: true, tone: "blue" },
      { href: "/virksomhed/medarbejdere", label: n.members, icon: "users", tone: "sky" },
      { href: "/virksomhed/rapport", label: n.report, icon: "file", tone: "slate" },
      { href: "/virksomhed/data", label: n.data, icon: "shield", tone: "mint" },
      { href: "/virksomhed/databehandleraftale", label: n.dpa, icon: "lock", tone: "ink" },
    ],
  };
}

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

async function Avatar() {
  const ctx = await getAuthContext().catch(() => null);
  if (!ctx) return null;
  return (
    <Link href="/konto" aria-label={getMessages().shell.learner.account} className="grid size-9 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-accent-ink ring-2 ring-surface transition-shadow hover:shadow-ring">
      {initials(ctx.user.name, ctx.user.email)}
    </Link>
  );
}

/** Panel top bar (desktop): search the help center, help, avatar. */
function TopBar() {
  const t = getMessages();
  return (
    <div className="sticky top-2 z-30 hidden h-16 items-center gap-4 rounded-t-xl border-b border-line bg-surface/90 px-6 backdrop-blur-md lg:flex lg:px-10">
      <form action="/hjaelp" role="search" className="relative w-full max-w-md">
        <label htmlFor="topbar-search" className="sr-only">
          {t.shell.searchLabel}
        </label>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle" />
        <input
          id="topbar-search"
          name="q"
          type="search"
          placeholder={t.shell.searchPlaceholder}
          className="h-10 w-full rounded-full border border-line bg-sunken pr-4 pl-10 text-body-sm text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow,background-color] focus:border-accent focus:bg-surface focus:shadow-ring focus:outline-none"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/hjaelp" aria-label={t.shell.learner.help} title={t.shell.learner.help} className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink">
          <Icon name="help" size={18} />
        </Link>
        <Suspense fallback={<span className="size-9 rounded-full bg-sunken" />}>
          <Avatar />
        </Suspense>
      </div>
    </div>
  );
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

function SidebarContent({ groups }: { groups: SidebarGroup[] }) {
  const t = getMessages();
  return (
    <div className="flex min-h-full flex-col gap-6 px-3 pt-5 pb-3">
      <Link href="/hjem" className="self-start rounded-sm px-2.5" aria-label={t.brand}>
        <Wordmark size={18} />
      </Link>
      <nav aria-label={t.shell.mainNav} className="flex flex-col gap-6">
        {groups.map((g, i) => (
          <div key={g.label ?? i} className="flex flex-col gap-0.5">
            {g.label && <p className="px-2.5 pb-1.5 text-overline text-ink-subtle uppercase">{g.label}</p>}
            {g.items.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact} variant="sidebar">
                {item.brand ? (
                  <BrandIcon brand={item.brand} />
                ) : item.dot ? (
                  <span className="grid size-7 place-items-center">
                    <span className={`size-2.5 rounded-full ring-4 ring-surface ${item.dot}`} />
                  </span>
                ) : (
                  item.icon && <AppIcon name={item.icon} tone={item.tone} size="sm" />
                )}
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <NavLink href="/hjaelp" variant="sidebar">
          <AppIcon name="help" tone="slate" size="sm" />
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
        <SidebarContent groups={groups} />
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
        <SidebarContent groups={groups} />
      </MobileNav>
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div id="indhold" className="app-panel flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-surface lg:min-h-[calc(100dvh-1rem)] lg:rounded-xl lg:border lg:border-line lg:shadow-xs">
          <TopBar />
          {children}
        </div>
      </div>
    </div>
  );
}
