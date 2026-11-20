import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import pg from "pg";
import { waitForLink } from "./outbox";
import { enterCode, loginWithCode } from "./login";

// M7: admin invites → employee accepts → shows on the dashboard (never prompt text); certificate verification
// page reachable by code only when the holder enabled it.

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

async function signIn(page: Page, email: string, from = "/log-ind") {
  await loginWithCode(page, email, from);
}

async function newContextPage(browser: Browser) {
  const context = await browser.newContext();
  return { context, page: await context.newPage() };
}

test("admin accepts the DPA, invites an employee, who accepts and shows on the dashboard — without prompt text", async ({ page, browser }) => {
  const ownerEmail = newEmail("m7-owner");
  await signIn(page, ownerEmail);
  await expect(page).toHaveURL(/\/hjem$/);
  await page.goto("/virksomhed/opret");
  await page.getByLabel("Virksomhedens navn").fill("M7 Firma ApS");
  await page.getByRole("button", { name: "Opret" }).click();
  await expect(page).toHaveURL(/\/virksomhed\/medarbejdere/);

  // Invitations are blocked until the DPA is accepted.
  const learnerEmail = newEmail("m7-learner");
  await page.getByLabel(/^Emails/).fill(learnerEmail);
  await page.getByRole("button", { name: "Send invitationer" }).click();
  await expect(page.getByTestId("invite-form").getByRole("alert")).toContainText("databehandleraftalen");

  await page.goto("/virksomhed/databehandleraftale");
  await expect(page.getByText("Udkast — afventer advokatgennemgang")).toBeVisible();
  await page.getByLabel("Dit fulde navn").fill("Olivia Ejer");
  await page.getByLabel("Din titel").fill("Direktør");
  await page.getByLabel("CVR-nummer").fill("12345678");
  await page.getByLabel("Jeg accepterer databehandleraftalen på vegne af virksomheden").check();
  await page.getByRole("button", { name: "Accepter aftalen" }).click();
  await expect(page.getByTestId("dpa-accepted")).toBeVisible();

  await page.goto("/virksomhed/medarbejdere");
  await page.getByLabel(/^Emails/).fill(`Navn;Email\nLærke;${learnerEmail}`);
  await page.getByRole("button", { name: "Send invitationer" }).click();
  await expect(page.getByTestId("invite-form")).toContainText("1 invitation(er) sendt.");
  await expect(page.getByTestId("pending-invitations")).toContainText(learnerEmail);

  const learner = await newContextPage(browser);
  await learner.page.goto(await waitForLink(learnerEmail, "invitation"));
  await learner.page.getByRole("link", { name: "Log ind for at acceptere" }).click();
  await learner.page.getByLabel("Email").fill(learnerEmail);
  await learner.page.getByRole("button", { name: "Send kode" }).click();
  await enterCode(learner.page, learnerEmail);
  await learner.page.getByRole("button", { name: "Accepter invitation" }).click();
  await expect(learner.page).toHaveURL(/\/konto\/data-info$/);
  await expect(learner.page.getByTestId("admin-cannot-see")).toContainText("prompts");
  await learner.page.getByRole("button", { name: "Forstået — fortsæt" }).click();
  // Invited employees then get the short onboarding (start → tool → plan).
  await expect(learner.page).toHaveURL(/\/kom-i-gang\?trin=velkommen$/);

  // The employee has written a prompt in a module (seeded directly): admins must never see it.
  const secret = `HEMMELIG-PROMPT-${randomUUID()}`;
  const [ids] = await sql<{ userId: string; organizationId: string }>(
    `SELECT m."userId", m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = $1`,
    [learnerEmail],
  );
  const [version] = await sql<{ id: string; moduleId: string; maxPoints: number }>(
    `SELECT v.id, v."moduleId", v."maxPoints" FROM module_version v JOIN module m ON m.id = v."moduleId" WHERE m.slug = 'core-prompt-01' ORDER BY v.version DESC LIMIT 1`,
  );
  const assignmentId = randomUUID();
  const attemptId = randomUUID();
  await sql(
    `INSERT INTO assignment (id, "organizationId", "userId", "moduleId", source, status, "bestScorePct", "passedAt", "bestAttemptId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'SELF', 'PASSED', 88, now(), $5, now(), now())`,
    [assignmentId, ids!.organizationId, ids!.userId, version!.moduleId, attemptId],
  );
  await sql(
    `INSERT INTO attempt (id, "organizationId", "userId", "assignmentId", "moduleVersionId", status, points, "maxPoints", "scorePct", passed, "completedAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'COMPLETED', 9, $6, 88, true, now(), now(), now())`,
    [attemptId, ids!.organizationId, ids!.userId, assignmentId, version!.id, version!.maxPoints],
  );
  await sql(
    `INSERT INTO step_result (id, "attemptId", "stepId", "stepType", points, "maxPoints", passed, "promptText", "aiFeedback", "createdAt", "updatedAt")
     VALUES ($1, $2, 'skriv-prompt', 'PROMPT_TASK', 9, 10, true, $3, $3, now(), now())`,
    [randomUUID(), attemptId, secret],
  );

  await page.goto("/virksomhed");
  await expect(page.getByTestId("stat-active")).toHaveText("2");
  await expect(page.getByTestId("stat-passed")).toHaveText("1");
  await page.goto("/virksomhed/medarbejdere");
  const row = page.getByTestId("member-row").filter({ hasText: learnerEmail });
  await expect(row).toContainText("88 %");
  await expect(row.getByTestId("member-status")).toHaveText("I gang");
  expect(await page.content()).not.toContain(secret);

  await row.getByRole("link", { name: "Se fremskridt" }).click();
  await expect(page.getByTestId("employee-modules")).toContainText("Din første gode prompt");
  expect(await page.content()).not.toContain(secret);

  await page.goto("/virksomhed/rapport");
  await expect(page.getByTestId("report-preview")).toContainText(learnerEmail);
  expect(await page.content()).not.toContain(secret);
  const csvResponse = await page.request.post("/api/virksomhed/rapport", { form: { format: "csv" } });
  expect(csvResponse.status()).toBe(200);
  const csv = await csvResponse.text();
  expect(csv).toContain(learnerEmail);
  expect(csv).toContain("Dokumenteret, rollebaseret tiltag efter art. 4");
  expect(csv).not.toContain(secret);
  expect(csv).not.toMatch(/certificering|lovkrav|påkrævet niveau|bøde/i);

  // The employee sees exactly what the admin sees.
  await learner.page.goto("/konto/data");
  await expect(learner.page.getByTestId("admin-sees")).toContainText("M7 Firma ApS");
  await expect(learner.page.getByTestId("admin-sees")).toContainText("88 %");
  await learner.context.close();
});

test("a certificate's public page works only after the holder enables it", async ({ page }) => {
  const email = newEmail("m7-cert");
  await signIn(page, email);
  await expect(page).toHaveURL(/\/hjem$/);
  const [ids] = await sql<{ userId: string; organizationId: string }>(
    `SELECT m."userId", m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = $1`,
    [email],
  );
  const [track] = await sql<{ id: string }>(`SELECT id FROM track WHERE key = 'CHATGPT'`);
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")).join("-");
  await sql(
    `INSERT INTO certificate (id, "verificationCode", "userId", "organizationId", "trackId", level, "levelLabel", "holderName", "moduleVersionIds", "contentVersion", "publicVerificationEnabled", "issuedAt")
     VALUES ($1, $2, $3, $4, $5, 1, 'Niveau 1 · Grundlag', 'Cert Holder E2E', '{}', 'pensum-2026.10', false, now())`,
    [randomUUID(), code, ids!.userId, ids!.organizationId, track!.id],
  );

  const anonymous = await page.context().browser()!.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto(`/certifikat/${code}`);
  await expect(visitor.getByText("Certifikatet findes ikke, eller den offentlige visning er slået fra.")).toBeVisible();
  await expect(visitor.getByText("Cert Holder E2E")).toHaveCount(0);

  await page.goto("/certifikater");
  await expect(page.getByTestId("certificates")).toContainText(code);
  await page.getByRole("button", { name: "Slå offentlig side til" }).click();
  await expect(page.getByText("Offentlig verifikationsside er slået til")).toBeVisible();

  await visitor.goto(`/certifikat/${code}`);
  await expect(visitor.getByTestId("public-certificate")).toContainText("Cert Holder E2E");
  await expect(visitor.getByTestId("public-certificate")).toContainText("ChatGPT");
  await expect(visitor.getByTestId("public-certificate")).toContainText("Niveau 1 · Grundlag");

  const pdf = await page.request.get(`/api/certifikater/${(await sql<{ id: string }>(`SELECT id FROM certificate WHERE "verificationCode" = $1`, [code]))[0]!.id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const visitorPdf = await visitor.request.get(`/api/certifikater/x/pdf`);
  expect(visitorPdf.status()).toBe(401);
  await anonymous.close();
});
