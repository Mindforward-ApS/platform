import { describe, expect, it } from "vitest";
import { getAuth } from "@/server/auth/better-auth";
import { createPreviewSession, ensurePreviewDemoUser, PREVIEW_DEMO_EMAIL } from "@/server/auth/preview-access";
import { testDb } from "./helpers";

describe("preview access", () => {
  it("always uses the same demo user and personal account", async () => {
    const a = await ensurePreviewDemoUser(testDb());
    const b = await ensurePreviewDemoUser(testDb());
    expect(b).toEqual(a);
    expect(await testDb().user.count({ where: { email: PREVIEW_DEMO_EMAIL } })).toBe(1);
    expect(await testDb().membership.count({ where: { userId: a.userId, role: "OWNER", organization: { type: "PERSONAL" } } })).toBe(1);
  });

  it("issues a cookie that Better Auth accepts as the demo user's session, with the personal account active", async () => {
    const cookie = await createPreviewSession(testDb());
    const session = await getAuth().api.getSession({ headers: new Headers({ cookie: `${cookie.name}=${encodeURIComponent(cookie.value)}` }) });
    expect(session?.user.email).toBe(PREVIEW_DEMO_EMAIL);
    const { organizationId } = await ensurePreviewDemoUser(testDb());
    expect((session?.session as { activeOrganizationId?: string } | undefined)?.activeOrganizationId).toBe(organizationId);
  });
});
