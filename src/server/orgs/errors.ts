// Domain errors for company-admin services. `code` maps to a Danish message in the UI (src/lib/i18n/da-admin.ts);
// seat errors carry their own explanation from src/server/orgs/seats.ts.

export type OrgAdminErrorCode =
  | "SEAT_LIMIT_REACHED"
  | "DPA_REQUIRED"
  | "PERSONAL_ORG"
  | "NO_EMAILS"
  | "TOO_MANY"
  | "LINK_INVALID"
  | "ALREADY_MEMBER"
  | "DOMAIN_INVALID"
  | "DOMAIN_PUBLIC"
  | "DOMAIN_TAKEN"
  | "DOMAIN_NOT_VERIFIED"
  | "DOMAIN_TXT_NOT_FOUND"
  | "DOMAIN_MISMATCH"
  | "EMAIL_NOT_VERIFIED"
  | "NOT_FOUND"
  | "OWNER_PROTECTED"
  | "LAST_OWNER";

export class OrgAdminError extends Error {
  constructor(
    public readonly code: OrgAdminErrorCode,
    public readonly explanation?: string,
  ) {
    super(explanation ?? code);
    this.name = "OrgAdminError";
  }
}
