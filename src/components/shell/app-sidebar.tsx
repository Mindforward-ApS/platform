import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/(learner)/konto/actions";
import { SiteLogo } from "@/components/ui/brand";
import { Icon, type IconName, type IconTone } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { MobileNav } from "./mobile-nav";
import { BrandIcon, type BrandKey } from "@/components/ui/brand-icon";
import { NavLink } from "./nav-link";
import { Breadcrumb, CollapseButton, ExpandableNav, type Crumb } from "./sidebar-client";

// Signed-in app frame, design v3 (Marco 16 Oct 2026, mindforward-preview/platform-preview.html): the app fills the
// viewport — full-height slate-blue sidebar on the left edge, white content panel to its right (the blue backdrop
// and rounded frame in the reference were presentation only). Phones: a dark top bar with the sidebar as a drawer.

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
  /** Indented sub-items under this item (expandable). */
  children?: SidebarItem[];
  /** Extra path prefixes that count as this item in the breadcrumb (e.g. /modul under Moduler). */
  also?: string[];
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
        // Forløb per tool (ChatGPT, Claude, Copilot); /forloeb opens ChatGPT. Text only, no vendor logos.
        { href: "/forloeb", label: getMessages().courses.navLabel, icon: "route", tone: "mint" },
        {
          href: "/moduler",
          label: t.learner.modules,
          icon: "book",
          tone: "amber",
          also: ["/modul"],
          children: [
            { href: "/plan", label: t.learner.plan, icon: "plan", tone: "mint" },
            { href: "/certifikater", label: t.learner.certificates, icon: "award", tone: "coral" },
          ],
        },
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
    <Link
      href="/konto"
      className="grid size-10 place-items-center rounded-full bg-sidebar text-caption font-semibold text-on-sidebar transition-shadow hover:shadow-ring"
    >
      <span aria-hidden="true">{initials(ctx.user.name, ctx.user.email)}</span>
      <span className="sr-only">{getMessages().shell.learner.account}</span>
    </Link>
  );
}

function crumbs(groups: SidebarGroup[]): Crumb[] {
  return groups.flatMap((g) =>
    g.items.flatMap((i) => [
      { href: i.href, label: i.label, group: g.label, exact: i.exact, also: i.also },
      ...(i.children ?? []).map((c) => ({ href: c.href, label: c.label, group: g.label, exact: c.exact, also: c.also })),
    ]),
  );
}

/** Panel top bar (desktop): breadcrumb left; search, help and avatar as pills right. */
function TopBar({ groups }: { groups: SidebarGroup[] }) {
  const t = getMessages();
  return (
    // h-20: the sandbox below sizes itself to 100dvh - 5rem, so together they fill the viewport exactly.
    // :3500 look: the bar is a white card on the cream page (pt-3 + h-16 + pb-1 keeps the 5rem the sandbox expects).
    <div className="sticky top-0 z-30 hidden h-20 shrink-0 bg-bg px-3 pt-3 pb-1 lg:block">
      <div className="flex h-16 items-center gap-6 rounded-[14px] border border-line bg-surface px-6">
        <Breadcrumb
          items={[
            ...crumbs(groups),
            { href: "/konto", label: t.shell.learner.account },
            { href: "/hjaelp", label: t.shell.learner.help },
            // Company pages reached from inside the admin area (not in the sidebar).
            ...(groups.some((g) => g.label === t.shell.companyGroup)
              ? [
                  { href: "/virksomhed/abonnement", label: t.billing.business.title, group: t.shell.companyGroup },
                  { href: "/virksomhed/maanedspakke", label: t.monthly.orgStatus.pageTitle, group: t.shell.companyGroup },
                ]
              : []),
          ]}
          label={t.shell.breadcrumb}
        />
        <div className="ml-auto flex items-center gap-2.5">
          <form action="/hjaelp" role="search" className="relative w-64 xl:w-72">
            <label htmlFor="topbar-search" className="sr-only">
              {t.shell.searchLabel}
            </label>
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" />
            <input
              id="topbar-search"
              name="q"
              type="search"
              placeholder={t.shell.searchPlaceholder}
              className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-11 text-body-sm text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] focus:border-accent focus:shadow-ring focus:outline-none"
            />
          </form>
          <Link
            href="/hjaelp"
            aria-label={t.shell.learner.help}
            title={t.shell.learner.help}
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-sunken"
          >
            <Icon name="help" size={18} />
          </Link>
          <Suspense fallback={<span className="size-11 rounded-full bg-sunken" />}>
            <Avatar />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function UserChip() {
  const ctx = await getAuthContext().catch(() => null);
  if (!ctx) return null;
  const { name, email } = ctx.user;
  const orgId = ctx.session.activeOrganizationId;
  const membership = orgId
    ? await db()
        .membership.findFirst({
          where: { userId: ctx.user.id, organizationId: orgId, deactivatedAt: null },
          select: { role: true, organization: { select: { name: true, type: true } } },
        })
        .catch(() => null)
    : null;
  const t = getMessages();
  // Business members see "Role · Company" (mock: "Ejer · Fjordlys"); private learners keep their email.
  const sub =
    membership?.organization.type === "BUSINESS"
      ? `${t.orgAdmin.roles[membership.role]} · ${membership.organization.name}`
      : name
        ? email
        : null;
  return (
    <Link
      href="/konto"
      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-sidebar-hover in-data-collapsed:flex-none"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sidebar-raised text-caption font-semibold text-on-sidebar ring-1 ring-sidebar-line">
        {initials(name, email)}
      </span>
      <span className="flex min-w-0 flex-col in-data-collapsed:sr-only">
        <span className="truncate text-label text-on-sidebar">{name || email}</span>
        {sub && <span className="truncate text-caption font-normal text-on-sidebar-muted">{sub}</span>}
      </span>
    </Link>
  );
}

function ItemIcon({ item }: { item: SidebarItem }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-[1.875rem] shrink-0 place-items-center rounded-full bg-sidebar-icon text-on-sidebar-muted transition-colors group-aria-[current=page]/nav:bg-sidebar-hover group-aria-[current=page]/nav:text-on-sidebar"
    >
      {item.brand ? (
        <BrandIcon brand={item.brand} size={18} />
      ) : item.dot ? (
        <span className={cx("size-2.5 rounded-[3px]", item.dot)} />
      ) : (
        item.icon && <Icon name={item.icon} size={17} />
      )}
    </span>
  );
}

function RailLink({ item }: { item: SidebarItem }) {
  return (
    <NavLink href={item.href} exact={item.exact} variant="rail">
      <ItemIcon item={item} />
      <span className="truncate in-data-collapsed:sr-only">{item.label}</span>
    </NavLink>
  );
}

/** :3500 look: small card at the bottom of the sidebar that points to the forløb. Hidden when the rail is collapsed. */
function PromoCard() {
  const t = getMessages().shell.promo;
  return (
    <div className="relative mb-3 overflow-hidden rounded-[14px] bg-sidebar-icon p-4 ring-1 ring-inset ring-sidebar-line in-data-collapsed:hidden">
      <p className="max-w-[10rem] text-[0.9375rem] leading-snug font-semibold text-on-sidebar">{t.title}</p>
      <p className="mt-1 text-[0.75rem] text-on-sidebar-subtle">{t.body}</p>
      <Link href="/forloeb" className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-mark-dot hover:underline">
        {t.cta}
        <Icon name="arrowRight" size={12} />
      </Link>
      <Icon name="book" size={44} className="pointer-events-none absolute right-3 bottom-3 text-sidebar-active opacity-80" />
    </div>
  );
}

function SidebarContent({ groups, rail = false }: { groups: SidebarGroup[]; rail?: boolean }) {
  const t = getMessages();
  return (
    <div className={cx("flex min-h-full flex-col px-5 pt-7 pb-4 in-data-collapsed:px-3", rail && "relative")}>
      <div className="flex flex-col gap-1 self-start px-2 pb-5 in-data-collapsed:self-center in-data-collapsed:px-0">
        <Link href="/hjem" className="rounded-md" aria-label={t.logoLabel}>
          <SiteLogo tone="light" className="in-data-collapsed:[&>span]:sr-only" />
        </Link>
        <p className="pl-0.5 text-[0.6875rem] text-on-sidebar-label in-data-collapsed:hidden">{t.shell.tagline}</p>
      </div>
      <nav aria-label={t.shell.mainNav} className="flex flex-col gap-1">
        {groups.map((g, i) => (
          <div key={g.label ?? i} className="flex flex-col gap-0.5">
            {g.label && (
              <p className="px-3 pt-4 pb-2 text-[0.6875rem] font-medium tracking-[0.12em] text-on-sidebar-label uppercase in-data-collapsed:sr-only">
                {g.label}
              </p>
            )}
            {g.items.map((item) =>
              item.children?.length ? (
                <ExpandableNav key={item.href} link={<RailLink item={item} />} label={item.label} toggleLabel={t.shell.showSubItems}>
                  {item.children.map((c) => (
                    <NavLink key={c.href} href={c.href} exact={c.exact} variant="railSub">
                      {c.label}
                    </NavLink>
                  ))}
                </ExpandableNav>
              ) : (
                <RailLink key={item.href} item={item} />
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 pt-6">
        <PromoCard />
        <RailLink item={{ href: "/hjaelp", label: t.shell.learner.help, icon: "help" }} />
        <div className="mt-2 flex items-center gap-1 border-t border-sidebar-line pt-3 in-data-collapsed:flex-col">
          <Suspense fallback={<span className="h-13 flex-1" />}>
            <UserChip />
          </Suspense>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={t.auth.logout}
              title={t.auth.logout}
              className="grid size-10 place-items-center rounded-full text-on-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-on-sidebar"
            >
              <Icon name="logout" size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** The whole signed-in frame: full-height dark sidebar and the white content panel. */
export function AppFrame({ groups = learnerGroups(), children }: { groups?: SidebarGroup[]; children: ReactNode }) {
  const t = getMessages();
  return (
    // Desktop is app-like: the frame is exactly one viewport tall, the sidebar scrolls on its own if needed, and only
    // the content panel (#indhold) scrolls — under a sticky top bar. Phones keep normal page scroll.
    <div className="flex flex-1 flex-col bg-bg lg:h-dvh lg:flex-none lg:overflow-hidden">
      <a
        href="#indhold"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md"
      >
        {t.shell.skipToContent}
      </a>
      <MobileNav
        openLabel={t.shell.openMenu}
        closeLabel={t.shell.closeMenu}
        bar={
          <Link href="/hjem" aria-label={t.logoLabel} className="rounded-sm">
            <SiteLogo tone="light" />
          </Link>
        }
      >
        <SidebarContent groups={groups} />
      </MobileNav>
      <div
        data-app-frame
        className="flex flex-1 flex-col lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[17.75rem_minmax(0,1fr)] lg:data-collapsed:grid-cols-[6.25rem_minmax(0,1fr)]"
      >
        {/* :3500 look: the dark brown sidebar sits inset with rounded corners and a faint coral glow at the top. */}
        <aside className="relative z-40 hidden bg-sidebar lg:m-3 lg:mr-0 lg:block lg:h-[calc(100dvh-1.5rem)] lg:rounded-[18px]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px] bg-[radial-gradient(120%_40%_at_30%_0%,var(--color-web-glow),transparent_70%)] opacity-60"
          />
          <CollapseButton collapseLabel={t.shell.collapseMenu} expandLabel={t.shell.expandMenu} />
          <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain rounded-[18px]">
            <SidebarContent groups={groups} rail />
          </div>
        </aside>
        <div
          id="indhold"
          className="app-panel relative flex min-h-[calc(100dvh-3.5rem)] min-w-0 flex-1 flex-col bg-bg lg:h-dvh lg:min-h-0 lg:scroll-pt-20 lg:overflow-y-auto lg:overscroll-contain"
        >
          <TopBar groups={groups} />
          {children}
        </div>
      </div>
    </div>
  );
}
