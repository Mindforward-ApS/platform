import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LegalLinksCard } from "@/components/legal/legal-links-card";
import { SettingsItem, SettingsList, SettingsRow } from "@/components/account/settings";
import { AccountDataLinks } from "@/components/admin/account-data-links";
import { needsFirstLoginInfo } from "@/server/admin/first-login";
import { TrainingReminders } from "@/components/monthly/training-reminders";
import { Icon } from "@/components/ui/icons";
import { SupportLauncher } from "@/components/support/support-widget";
import { Badge, ButtonLink, Card, DescriptionList, Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { signOut, switchOrganization } from "./actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const m = getMessages();
  const t = m.account;
  const ctx = await guardPage(() => requireUser(), "/konto");
  const sp = await searchParams;
  const memberships = await db().membership.findMany({
    where: { userId: ctx.user.id, deactivatedAt: null, organization: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    select: { role: true, organization: { select: { id: true, name: true, type: true } } },
  });
  const active = memberships.find((x) => x.organization.id === ctx.session.activeOrganizationId);
  // M7: B2B employees see once what their admin can and cannot see (docs/10 § 1.6).
  if (active && (await needsFirstLoginInfo(db(), ctx.user.id, active.organization.id))) redirect("/konto/data-info");
  const tracks = await db().track.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { key: true, displayName: true },
  });
  const ts = m.sandbox;
  const others = memberships.filter((x) => x.organization.id !== active?.organization.id);
  const isBusinessAdmin = Boolean(active && active.role !== "LEARNER" && active.organization.type === "BUSINESS");

  return (
    <>
      {sp.fejl === "adgang" && <Notice tone="error">{m.business.errors.notAllowed}</Notice>}

      {/* Wide screens: two columns of settings cards (dashboard layout, Marco 14 Oct 2026). */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Card
            title={t.profile.title}
            description={t.profile.description}
            footer={
              <form action={signOut}>
                <SubmitButton variant="secondary">{m.auth.logout}</SubmitButton>
              </form>
            }
          >
            <DescriptionList
              items={[
                [
                  t.profile.name,
                  ctx.user.name || (
                    <span key="noname" className="text-ink-subtle">
                      {t.profile.noName}
                    </span>
                  ),
                ],
                [
                  t.profile.email,
                  <span key="email" className="break-all">
                    {ctx.user.email}
                  </span>,
                ],
              ]}
            />
          </Card>

          <Card
            title={t.organization.title}
            description={t.organization.description}
            padded={false}
            footer={
              <>
                {isBusinessAdmin && (
                  <ButtonLink href="/virksomhed/medarbejdere" variant="ghost" icon="users">
                    {t.members}
                  </ButtonLink>
                )}
                <ButtonLink href="/virksomhed/opret" variant="secondary" icon="plus">
                  {t.createBusiness}
                </ButtonLink>
              </>
            }
          >
            <div className="p-6">
              {active ? (
                <div data-testid="active-org">
                  <DescriptionList
                    items={[
                      [
                        t.activeOrg,
                        <span key="org" className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{active.organization.name}</span>
                          <Badge>{t.orgType[active.organization.type]}</Badge>
                        </span>,
                      ],
                      [
                        t.role,
                        <span key="role" data-testid="active-role">
                          {t.roles[active.role]}
                        </span>,
                      ],
                    ]}
                  />
                </div>
              ) : (
                <p className="text-body-sm text-ink-muted">{t.organization.none}</p>
              )}
            </div>
            {others.length > 0 && (
              <div className="border-t border-line">
                <p className="px-6 pt-4 text-overline text-ink-muted uppercase">{t.organization.otherTitle}</p>
                <div className="divide-y divide-line">
                  {others.map((x) => (
                    <SettingsItem
                      key={x.organization.id}
                      title={x.organization.name}
                      description={`${t.orgType[x.organization.type]} · ${t.roles[x.role]}`}
                    >
                      <form action={switchOrganization}>
                        <input type="hidden" name="organizationId" value={x.organization.id} />
                        <SubmitButton variant="secondary">
                          {t.switchOrg} {x.organization.name}
                        </SubmitButton>
                      </form>
                    </SettingsItem>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <TrainingReminders userId={ctx.user.id} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={t.training.title} description={t.training.description} padded={false}>
            <SettingsList label={t.training.title}>
              <SettingsRow id="row-modules" href="/moduler" icon="book" label={m.player.list.toModules} hint={t.training.modulesHint} />
            </SettingsList>
            {active && (
              <section className="border-t border-line" data-testid="sandbox-links" aria-labelledby="sandbox-heading">
                <h3 id="sandbox-heading" className="px-6 pt-4 text-overline text-ink-muted uppercase">
                  {ts.accountHeading}
                </h3>
                {tracks.length === 0 ? (
                  <p className="px-6 py-4 text-body-sm text-ink-muted">{ts.noTracks}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {tracks.map((tr) => (
                      <li key={tr.key}>
                        <a
                          href={`/sandkasse/${tr.key.toLowerCase()}`}
                          className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-sunken focus-visible:-outline-offset-2"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-label text-ink">{tr.displayName}</span>
                            <span className="text-body-sm text-ink-muted">{format(ts.practiceFor, { product: tr.displayName })}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-label text-accent">
                            <span className="hidden sm:inline">{ts.accountLink}</span>
                            <span className="sr-only sm:hidden">{ts.accountLink}</span>
                            <Icon name="arrowRight" className="transition-transform duration-[120ms] group-hover:translate-x-0.5" />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </Card>

          <AccountDataLinks user={ctx.user} isBusinessAdmin={isBusinessAdmin} />
          <LegalLinksCard />
        </div>
      </div>
    </>
  );
}

export default function AccountPage(props: PageProps<"/konto">) {
  const t = getMessages().account;
  return (
    <Page title={t.title} lead={t.lead} width="app">
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
      <SupportLauncher t={getMessages().support.widget} />
    </Page>
  );
}
