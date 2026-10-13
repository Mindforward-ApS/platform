// Typed audit actions (docs/02-arkitektur.md § 2). Extend the union; never store prompt text or secrets in metadata.
export const AUDIT_ACTIONS = [
  "ORG_CREATED",
  "MEMBER_JOINED",
  "MEMBER_ROLE_CHANGED",
  "INVITATION_CREATED",
  "INVITATION_CANCELED",
  "PLATFORM_ROLE_GRANTED",
  "TWO_FACTOR_ENROLLED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
