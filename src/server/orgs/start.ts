// Pure decision for the post-login /start step (docs/OPEN-QUESTIONS.md M1: PERSONAL org only without membership or invitation).

export interface StartInput {
  activeOrganizationId: string | null;
  /** Active (not deactivated) memberships, oldest first. */
  memberships: { organizationId: string }[];
  /** Pending, unexpired invitations for the user's email, oldest first. */
  pendingInvitationIds: string[];
}

export type StartDecision =
  | { kind: "continue" }
  | { kind: "activate"; organizationId: string }
  | { kind: "open-invitation"; invitationId: string }
  | { kind: "create-personal-org" };

export function decideStart(input: StartInput): StartDecision {
  const first = input.memberships[0];
  if (input.activeOrganizationId && input.memberships.some((m) => m.organizationId === input.activeOrganizationId)) {
    return { kind: "continue" };
  }
  if (first) return { kind: "activate", organizationId: first.organizationId };
  const invitation = input.pendingInvitationIds[0];
  if (invitation) return { kind: "open-invitation", invitationId: invitation };
  return { kind: "create-personal-org" };
}

/** After login: show the work-profile step (industry → connector recommendations) once, unless done or skipped. */
export function needsProfile(profile: { completedAt: Date | null; skippedAt: Date | null } | null): boolean {
  return !profile || (!profile.completedAt && !profile.skippedAt);
}
