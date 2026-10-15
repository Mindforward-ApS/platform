import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { CERTIFICATE_LEVELS } from "../../src/lib/config/certificates";
import { waitForLink } from "./outbox";

// A learner who finished level 1 privately joins a company: they choose to bring their results along, the company
// sees the same certificate (not a new one), and they can share it on LinkedIn, by link and in their CV.

const newEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.test`;

async function sql<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<T>(text, values)).rows;
  } finally {
    await client.end();
  }
}

async function signIn(page: Page, email: string) {
  await page.goto("/opret");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login-link" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await page.goto(await waitForLink(email, "magic-link"));
  await expect(page).toHaveURL(/\/hjem$/);
}

/** Level 1 passed in the learner's private account, plus its certificate (set up directly, like a finished run). */
async function finishLevelOnePrivately(email: string) {
  const [user] = await sql<{ id: string; orgId: string }>(
    `SELECT u.id, m."organizationId" AS "orgId" FROM "user" u JOIN membership m ON m."userId" = u.id JOIN organization o ON o.id = m."organizationId" WHERE u.email = $1 AND o.type = 'PERSONAL'`,
    [email],
  );
  const [track] = await sql<{ id: string }>(`SELECT id FROM track WHERE key = 'CHATGPT'`);
  await sql(`INSERT INTO track_enrollment (id, "organizationId", "userId", "trackId", "updatedAt") VALUES ($1, $2, $3, $4, now()) ON CONFLICT DO NOTHING`, [randomUUID(), user!.orgId, user!.id, track!.id]);
  for (const slug of CERTIFICATE_LEVELS[0]!.requiredModules) {
    await sql(
      `INSERT INTO assignment (id, "organizationId", "userId", "moduleId", source, status, "bestScorePct", "passedAt", "updatedAt")
       SELECT $1, $2, $3, id, 'SELF', 'PASSED', 90, now() - interval '20 days', now() FROM module WHERE slug = $4`,
      [randomUUID(), user!.orgId, user!.id, slug],
    );
  }
  const code = "K7QX-M4RT-9W2P".replace(/./g, (ch) => (ch === "-" ? "-" : "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]!));
  await sql(
    `INSERT INTO certificate (id, "verificationCode", "userId", "organizationId", "trackId", level, "levelLabel", "holderName", "contentVersion")
     VALUES ($1, $2, $3, $4, $5, 1, $6, 'Kim Lund', 'pensum-2026.10')`,
    [randomUUID(), code, user!.id, user!.orgId, track!.id, CERTIFICATE_LEVELS[0]!.label],
  );
  return { userId: user!.id, code, trackId: track!.id };
}

/** The learner joins a company (as if by invitation) and it becomes their active account. */
async function joinCompany(userId: string, trackId: string) {
  const orgId = randomUUID();
  await sql(`INSERT INTO organization (id, name, slug, type, "seatLimit", "dpaAcceptedAt", "dpaVersion", "updatedAt") VALUES ($1, 'Carry Firma ApS', $2, 'BUSINESS', 5, now(), 'dpa.v1', now())`, [orgId, `carry-${orgId}`]);
  await sql(`INSERT INTO membership (id, "organizationId", "userId", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'LEARNER', now(), now())`, [randomUUID(), orgId, userId]);
  await sql(`INSERT INTO track_enrollment (id, "organizationId", "userId", "trackId", "updatedAt") VALUES ($1, $2, $3, $4, now())`, [randomUUID(), orgId, userId, trackId]);
  await sql(`UPDATE session SET "activeOrganizationId" = $1 WHERE "userId" = $2`, [orgId, userId]);
  return orgId;
}

test("a private learner brings level 1 into their company and shares the same certificate", async ({ page }) => {
  const email = newEmail("carry");
  await signIn(page, email);
  const { userId, code, trackId } = await finishLevelOnePrivately(email);
  const companyId = await joinCompany(userId, trackId);

  // B2B employees first see what the admin can see (docs/10 § 1.6); then the offer on Hjem.
  await page.goto("/hjem");
  await page.waitForURL(/\/konto\/data-info$/);
  await page.getByRole("button", { name: "Forstået — fortsæt" }).click();
  await page.goto("/hjem");
  const offer = page.getByTestId("transfer-offer");
  await expect(offer).toContainText("Tag dine resultater med til Carry Firma ApS");
  await expect(offer).toContainText("9 beståede moduler");
  await page.getByRole("button", { name: "Kun nødvendige" }).click();
  await offer.screenshot({ path: "test-results/carry-offer.png" });
  await offer.getByRole("button", { name: "Ja, tag dem med" }).click();
  await expect(page.getByTestId("transfer-offer")).toHaveCount(0);

  const [counts] = await sql<{ carried: string; certs: string; shares: string }>(
    `SELECT (SELECT count(*) FROM assignment WHERE "organizationId" = $1 AND "userId" = $2 AND source = 'CARRIED_OVER') AS carried,
            (SELECT count(*) FROM certificate WHERE "userId" = $2) AS certs,
            (SELECT count(*) FROM certificate_share WHERE "organizationId" = $1) AS shares`,
    [companyId, userId],
  );
  expect(counts).toEqual({ carried: "9", certs: "1", shares: "1" });

  // Sharing needs the public page; once on, LinkedIn, link and CV line appear.
  await page.goto("/certifikater");
  await expect(page.getByTestId("certificate-share")).toContainText("Slå den offentlige side til for at dele");
  await page.getByRole("button", { name: /Slå offentlig/i }).click();
  const add = page.getByTestId("linkedin-add");
  await expect(add).toBeVisible();
  const href = new URL((await add.getAttribute("href"))!);
  expect(href.hostname).toBe("www.linkedin.com");
  expect(href.searchParams.get("certId")).toBe(code);
  await expect(page.getByTestId("cv-line")).toContainText(`ID ${code}`);
  await page.screenshot({ path: "test-results/carry-share.png", fullPage: true });

  // Badge for the CV and the link preview image are real PNGs.
  const certId = (await sql<{ id: string }>(`SELECT id FROM certificate WHERE "verificationCode" = $1`, [code]))[0]!.id;
  const badge = await page.request.get(`/api/certifikater/${certId}/badge`);
  expect(badge.headers()["content-type"]).toBe("image/png");
  const pdf = await page.request.get(`/api/certifikater/${certId}/pdf`);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const og = await page.request.get(`/certifikat/${code}/opengraph-image`);
  expect(og.headers()["content-type"]).toContain("image/png");
});
