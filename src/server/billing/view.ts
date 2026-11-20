import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getMessages } from "@/lib/i18n";
import { accessEndsAt } from "./cancel";
import { currentSubscription, getEntitlements } from "./entitlements";
import { isPaidPlanKey } from "./plans";
import { formatDate } from "./time";
import { isWithdrawalOpen } from "./withdrawal";

/** Everything the subscription pages show, read only from `Subscription` (written by the webhook). */
export async function subscriptionView(db: PrismaClient, organizationId: string, now: Date = new Date()) {
  const t = getMessages().billing;
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { type: true, seatLimit: true } });
  const sub = await currentSubscription(db, organizationId);
  const entitlements = await getEntitlements(db, organizationId, now);
  const withdrawn = sub ? (await db.withdrawalRequest.count({ where: { subscriptionId: sub.id } })) > 0 : false;
  const live = Boolean(sub && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(sub.status) && entitlements.access === "FULL");
  const end = sub ? accessEndsAt(sub) : null;
  return {
    org,
    sub,
    entitlements,
    withdrawn,
    live,
    planName: sub && isPaidPlanKey(sub.planKey) ? t.planNames[sub.planKey] : t.planNames.FREE,
    statusName: withdrawn ? t.status.CANCELED : sub ? t.status[sub.status] : t.status.NONE,
    endDate: end ? formatDate(end) : null,
    canCancel: live && !sub?.cancelAtPeriodEnd && !withdrawn,
    canResume: live && Boolean(sub?.cancelAtPeriodEnd) && !withdrawn,
    withdrawalOpen: Boolean(
      sub && isWithdrawalOpen({ orgType: org.type, status: sub.status, withdrawalDeadlineAt: sub.withdrawalDeadlineAt, alreadyWithdrawn: withdrawn }, now),
    ),
    withdrawalDeadline: sub?.withdrawalDeadlineAt ? formatDate(sub.withdrawalDeadlineAt) : null,
  };
}
