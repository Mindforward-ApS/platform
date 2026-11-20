import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

// Role names match the MembershipRole enum (Prisma owns the names, docs/00-beslutninger.md § 9).
// Conservative: only OWNER changes roles or removes members; ADMIN invites; LEARNER has no org permissions.
export const ac = createAccessControl(defaultStatements);

export const roles = {
  OWNER: ac.newRole({ organization: ["update"], member: ["create", "update", "delete"], invitation: ["create", "cancel"] }),
  ADMIN: ac.newRole({ invitation: ["create", "cancel"] }),
  LEARNER: ac.newRole({}),
};
