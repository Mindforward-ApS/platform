import "server-only";
import type { OrganizationType, PrismaClient, SubscriptionStatus } from "@/generated/prisma/client";
import { ownerDashboard, type OwnerDashboardConfig } from "@/lib/config/owner-dashboard";
import { assertAdminSafe } from "@/server/admin/allowed-fields";
import {
  completionPct,
  customerStatus,
  isOpenSubscription,
  monthlyNetOre,
  paidSeats,
  pickCurrentSubscription,
  summarize,
  type CustomerStatus,
  type SubscriptionInput,
  type Totals,
} from "./customer-metrics";

// Owner customer overview (/admin/kunder) for GREB_ADMIN only — callers authorise with requirePlatformAdmin().
// Cross-org by design (Mindforward's own operations), but aggregates only: counts, shares, revenue, dates.
// Companies are listed by name; private (B2C) customers are one aggregated line, never listed by person.
// Explicit selects only (no include), and the result passes assertAdminSafe like every admin read model.

export interface CompanyRow {
  organizationId: string;
  name: string;
  country: string;
  seatLimit: number;
  activeMembers: number;
  membersWithPassed: number;
  completionPct: number | null;
  mrrOre: number;
  paidSeats: number;
  planKey: string | null;
  status: CustomerStatus;
  lastActivityAt: Date | null;
}

export interface PrivateCustomers {
  count: number;
  paymentIssues: number;
  activeMembers: number;
  membersWithPassed: number;
  completionPct: number | null;
  mrrOre: number;
  paidSeats: number;
}

export interface CustomerOverview {
  generatedAt: Date;
  companies: CompanyRow[];
  privateCustomers: PrivateCustomers;
  totals: Totals & { companies: number; privateCustomers: number };
}

type SubRow = SubscriptionInput & { organizationId: string; orgType: OrganizationType };

const PAYMENT_ISSUE_STATUSES: SubscriptionStatus[] = ["PAST_DUE", "UNPAID", "INCOMPLETE", "PAUSED"];

export async function customerOverview(
  db: PrismaClient,
  now: Date = new Date(),
  cfg: OwnerDashboardConfig = ownerDashboard,
): Promise<CustomerOverview> {
  const [companies, subRows] = await Promise.all([
    db.organization.findMany({
      where: { type: "BUSINESS", deletedAt: null },
      select: { id: true, name: true, country: true, seatLimit: true, createdAt: true },
    }),
    db.subscription.findMany({
      where: { organization: { deletedAt: null } },
      select: {
        organizationId: true,
        planKey: true,
        status: true,
        quantity: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
        plan: { select: { unitAmountOre: true } },
        organization: { select: { type: true } },
      },
    }),
  ]);

  const subs: SubRow[] = subRows.map((s) => ({
    organizationId: s.organizationId,
    orgType: s.organization.type,
    planKey: s.planKey,
    status: s.status,
    quantity: s.quantity,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    createdAt: s.createdAt,
    unitAmountOre: s.plan?.unitAmountOre ?? null,
  }));
  const subsByOrg = groupBy(subs, (s) => s.organizationId);
  const currentSub = new Map([...subsByOrg].map(([orgId, list]) => [orgId, pickCurrentSubscription(list)]));

  // Private customers = PERSONAL orgs whose current subscription is still open (free B2C users are not customers).
  const privateOrgIds = [...currentSub]
    .filter(([, s]) => s !== null && s.orgType === "PERSONAL" && isOpenSubscription(s.status))
    .map(([orgId]) => orgId);
  const orgIds = [...companies.map((c) => c.id), ...privateOrgIds];

  const [members, passed, attempts] = await Promise.all([
    db.membership.findMany({
      where: { organizationId: { in: orgIds }, deactivatedAt: null },
      select: { organizationId: true, userId: true, user: { select: { lastActiveAt: true } } },
    }),
    db.assignment.groupBy({ by: ["organizationId", "userId"], where: { organizationId: { in: orgIds }, status: "PASSED" } }),
    db.attempt.groupBy({ by: ["organizationId"], where: { organizationId: { in: orgIds } }, _max: { updatedAt: true } }),
  ]);

  const activeUsers = new Map<string, Set<string>>();
  const lastSeen = new Map<string, number>();
  for (const m of members) {
    const set = activeUsers.get(m.organizationId) ?? new Set<string>();
    set.add(m.userId);
    activeUsers.set(m.organizationId, set);
    if (m.user.lastActiveAt) lastSeen.set(m.organizationId, Math.max(lastSeen.get(m.organizationId) ?? 0, m.user.lastActiveAt.getTime()));
  }
  for (const a of attempts) {
    const at = a._max.updatedAt?.getTime();
    if (at) lastSeen.set(a.organizationId, Math.max(lastSeen.get(a.organizationId) ?? 0, at));
  }
  const passedActive = new Map<string, number>();
  for (const p of passed) {
    if (activeUsers.get(p.organizationId)?.has(p.userId)) passedActive.set(p.organizationId, (passedActive.get(p.organizationId) ?? 0) + 1);
  }

  const learning = (orgId: string) => {
    const active = activeUsers.get(orgId)?.size ?? 0;
    const withPassed = passedActive.get(orgId) ?? 0;
    return { activeMembers: active, membersWithPassed: withPassed };
  };

  const companyRows: CompanyRow[] = companies.map((org) => {
    const sub = currentSub.get(org.id) ?? null;
    const last = lastSeen.get(org.id);
    const lastActivityAt = last ? new Date(last) : null;
    const { activeMembers, membersWithPassed } = learning(org.id);
    return {
      organizationId: org.id,
      name: org.name,
      country: org.country,
      seatLimit: org.seatLimit,
      activeMembers,
      membersWithPassed,
      completionPct: completionPct(activeMembers, membersWithPassed),
      mrrOre: sub ? monthlyNetOre(sub) : 0,
      paidSeats: sub ? paidSeats(sub) : 0,
      planKey: sub?.planKey ?? null,
      status: customerStatus({ subscription: sub, createdAt: org.createdAt, lastActivityAt }, now, cfg),
      lastActivityAt,
    };
  });
  companyRows.sort((a, b) => b.mrrOre - a.mrrOre || b.activeMembers - a.activeMembers || a.name.localeCompare(b.name, "da"));

  const privateParts = privateOrgIds.flatMap((orgId) => {
    const sub = currentSub.get(orgId);
    if (!sub) return [];
    return [
      {
        ...learning(orgId),
        mrrOre: monthlyNetOre(sub),
        paidSeats: paidSeats(sub),
        paymentIssue: PAYMENT_ISSUE_STATUSES.includes(sub.status),
      },
    ];
  });
  const privateTotals = summarize(privateParts, cfg.arrGoalOre);
  const privateCustomers: PrivateCustomers = {
    count: privateParts.length,
    paymentIssues: privateParts.filter((p) => p.paymentIssue).length,
    activeMembers: privateParts.reduce((acc, p) => acc + p.activeMembers, 0),
    membersWithPassed: privateParts.reduce((acc, p) => acc + p.membersWithPassed, 0),
    completionPct: privateTotals.completionPct,
    mrrOre: privateTotals.mrrOre,
    paidSeats: privateTotals.paidSeats,
  };

  const totals = summarize([...companyRows, ...privateParts], cfg.arrGoalOre);
  return assertAdminSafe({
    generatedAt: now,
    companies: companyRows,
    privateCustomers,
    totals: {
      ...totals,
      companies: companyRows.filter((c) => c.status.kind !== "CANCELED").length,
      privateCustomers: privateCustomers.count,
    },
  });
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}
