import { describe, expect, it } from "vitest";
import { decideStart } from "@/server/orgs/start";

const base = { activeOrganizationId: null, memberships: [], pendingInvitationIds: [] };

describe("decideStart", () => {
  it("creates a PERSONAL org for a brand-new user without invitations", () => {
    expect(decideStart(base)).toEqual({ kind: "create-personal-org" });
  });

  it("sends an invited user to the invitation instead of creating a PERSONAL org", () => {
    expect(decideStart({ ...base, pendingInvitationIds: ["inv-1", "inv-2"] })).toEqual({ kind: "open-invitation", invitationId: "inv-1" });
  });

  it("keeps a valid active organization", () => {
    expect(decideStart({ ...base, activeOrganizationId: "o1", memberships: [{ organizationId: "o1" }] })).toEqual({ kind: "continue" });
  });

  it("switches to the first membership when the active org is missing or no longer valid", () => {
    expect(decideStart({ ...base, activeOrganizationId: "gone", memberships: [{ organizationId: "o2" }] })).toEqual({
      kind: "activate",
      organizationId: "o2",
    });
  });

  it("prefers a pending invitation over activating an existing membership only when there is no membership", () => {
    expect(decideStart({ ...base, memberships: [{ organizationId: "o3" }], pendingInvitationIds: ["inv"] })).toEqual({
      kind: "activate",
      organizationId: "o3",
    });
  });
});
