import Link from "next/link";
import { cache, Suspense, type ReactNode } from "react";
import { BellIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { MindforwardLogo } from "@/components/platform/logo";
import { MobileNav } from "@/components/platform/shell/mobile-nav";
import { NavList, PromoCard, StaticNavList, type NavItem } from "@/components/platform/shell/sidebar-nav";
import { getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";

// Signed-in app frame = the approved platform shell (mindforward-platform :3500, Marco Nov 2026): a sticky,
// full-height brown sidebar flush left with rounded right corners, and the page to its right under a white top bar
// card. Phones: the top bar gets a menu button and the sidebar opens as a drawer.
// Greb's routes behind the approved menu: Oversigt = /hjem, Mine kurser = /forloeb, Øvemiljø = /sandkasse,
// Kursusbeviser = /certifikater, Kalender = /kalender, Beskeder = /beskeder, Mit hold = /hold (company admins only),
// Indstillinger = /konto, Hjælp = /hjaelp. Company admins also get "Virksomhed" (/virksomhed) so the admin pages stay
// reachable.

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Who is signed in, once per request (sidebar, drawer and top bar all read it). */
const frameUser = cache(async () => {
  const ctx = await getAuthContext().catch(() => null);
  if (!ctx) return null;
  const orgId = ctx.session.activeOrganizationId;
  const membership = orgId
    ? await db()
        .membership.findFirst({
          where: { userId: ctx.user.id, organizationId: orgId, deactivatedAt: null },
          select: { role: true, organization: { select: { name: true, type: true } } },
        })
        .catch(() => null)
    : null;
  const isCompanyAdmin = membership?.organization.type === "BUSINESS" && (membership.role === "OWNER" || membership.role === "ADMIN");
  const t = getMessages();
  return {
    name: ctx.user.name?.trim() || ctx.user.email,
    initials: initials(ctx.user.name, ctx.user.email),
    role: membership ? t.orgAdmin.roles[membership.role] : t.platform.shell.privateRole,
    isCompanyAdmin,
  };
});

function navItems(isCompanyAdmin: boolean): NavItem[] {
  const n = getMessages().platform.nav;
  return [
    { href: "/hjem", label: n.home, icon: "home" },
    { href: "/forloeb", label: n.courses, icon: "courses", also: ["/moduler", "/modul", "/plan"] },
    { href: "/sandkasse", label: n.sandbox, icon: "sandbox" },
    { href: "/certifikater", label: n.certificates, icon: "certificates" },
    { href: "/kalender", label: n.calendar, icon: "calendar" },
    // The badge matches the example threads on /beskeder (there is no message backend yet).
    { href: "/beskeder", label: n.messages, icon: "messages", badge: 3 },
    ...(isCompanyAdmin
      ? ([
          { href: "/hold", label: n.team, icon: "team" },
          { href: "/virksomhed", label: n.company, icon: "company" },
        ] satisfies NavItem[])
      : []),
    { href: "/konto", label: n.settings, icon: "settings", also: ["/profil"] },
    { href: "/hjaelp", label: n.help, icon: "help" },
  ];
}

async function UserNav() {
  const user = await frameUser();
  return <NavList items={navItems(Boolean(user?.isCompanyAdmin))} label={getMessages().shell.mainNav} />;
}

function Promo() {
  const p = getMessages().platform.promo;
  return <PromoCard title={p.title} body={p.body} cta={p.cta} href="/kalender" />;
}

function Brand() {
  const t = getMessages();
  return (
    <div className="px-2 pt-3 pb-6">
      <Link href="/hjem" aria-label={t.logoLabel} className="inline-block rounded-md">
        <MindforwardLogo size={26} />
      </Link>
      <div className="mt-1 pl-0.5 text-[0.625rem] text-pf-white/50">{t.shell.tagline}</div>
    </div>
  );
}

async function UserMobileNav() {
  const user = await frameUser();
  const t = getMessages();
  return (
    <MobileNav
      items={navItems(Boolean(user?.isCompanyAdmin))}
      logo={<MindforwardLogo size={24} />}
      promo={<Promo />}
      labels={{ open: t.shell.openMenu, close: t.shell.closeMenu, nav: t.shell.mainNav }}
    />
  );
}

async function UserChip() {
  const user = await frameUser();
  if (!user) return null;
  return (
    // Initials, not a face: no invented people.
    <Link href="/konto" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ink)] text-[0.75rem] font-semibold text-pf-white">{user.initials}</span>
      <span className="hidden leading-tight sm:block">
        <span className="block max-w-[14rem] truncate text-[0.8125rem] font-semibold text-heading">{user.name}</span>
        <span className="block text-[0.6875rem] text-pf-muted">{user.role}</span>
      </span>
    </Link>
  );
}

function TopBar() {
  const t = getMessages();
  const p = t.platform.shell;
  return (
    <div className="app-card flex items-center justify-between gap-3 !rounded-[14px] px-3 py-2.5">
      <Suspense fallback={<span className="size-9 lg:hidden" />}>
        <UserMobileNav />
      </Suspense>
      {/* Search goes to the help center (the only searchable content today). */}
      <form action="/hjaelp" role="search" className="flex h-9 w-full max-w-md items-center gap-2 rounded-[10px] bg-[var(--bg)] px-3 text-[0.8125rem]">
        <label htmlFor="topbar-search" className="sr-only">
          {t.shell.searchLabel}
        </label>
        <MagnifyingGlassIcon size={16} className="text-pf-muted" />
        <input id="topbar-search" name="q" type="search" placeholder={p.searchPlaceholder} className="w-full bg-transparent text-heading outline-none placeholder:text-pf-muted" />
      </form>
      <div className="ml-auto flex items-center gap-4">
        <Link href="/beskeder" aria-label={p.notifications} className="relative grid h-9 w-9 place-items-center text-heading">
          <BellIcon size={20} />
          <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--coral)] px-1 text-[0.5625rem] font-bold text-pf-white">3</span>
        </Link>
        <Suspense fallback={<span className="h-9 w-9 rounded-full bg-[var(--hover-fill)]" />}>
          <UserChip />
        </Suspense>
      </div>
    </div>
  );
}

/** The whole signed-in frame. `data-pf-main` is the page area pages size themselves against. */
export function AppFrame({ children }: { children: ReactNode }) {
  const t = getMessages();
  return (
    <div className="app flex min-h-svh flex-1">
      <a
        href="#indhold"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-pf-white focus:px-3 focus:py-2"
      >
        {t.shell.skipToContent}
      </a>
      <aside className="app-side sticky top-0 z-40 hidden h-svh w-60 shrink-0 flex-col overflow-y-auto rounded-r-[18px] p-3 pt-6 lg:flex">
        <Brand />
        <Suspense fallback={<StaticNavList items={navItems(false)} label={t.shell.mainNav} />}>
          <UserNav />
        </Suspense>
        <div className="mt-auto pt-4">
          <Promo />
        </div>
      </aside>
      <div id="indhold" data-pf-main className="app-panel min-w-0 flex-1 px-4 py-3 lg:px-3 lg:pr-3">
        <TopBar />
        <div data-pf-page className="pt-3 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
