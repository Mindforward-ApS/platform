import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import pg from "pg";
import { OUTBOX_DIR } from "./outbox";

// M8: a real marketing mail (manual newsletter, sent through the send-time consent gate) carries an unsubscribe
// link that works WITHOUT login and is recorded (ConsentRecord WITHDRAWN + EmailSuppression). The RFC 8058
// one-click POST from the List-Unsubscribe header is recorded too.

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const PEPPER = process.env.EMAIL_HASH_PEPPER ?? "";
const newEmail = () => `nl-${randomUUID().slice(0, 8)}@example.test`;
// A working day 11:00 Copenhagen (outside marketing quiet hours) — the script's --now is non-production only.
const SEND_AT = "2026-10-13T09:00:00Z";

async function withDb<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** A confirmed double opt-in (GRANTED → CONFIRMED), as the M5 flow writes it. */
async function confirmedConsent(email: string) {
  await withDb(async (c) => {
    const grant = `e2e_${randomUUID()}`;
    const base = [email, "marketing-consent.v1", "e2e-hash"];
    await c.query(
      `INSERT INTO consent_record (id, "subjectEmail", channel, purpose, action, "textVersion", "textHash", source, "createdAt", "confirmedAt")
       VALUES ($1, $2, 'EMAIL', 'MARKETING_EMAIL', 'GRANTED', $3, $4, 'PLACEMENT_RESULT', now() - interval '2 minutes', now() - interval '1 minute')`,
      [grant, ...base],
    );
    await c.query(
      `INSERT INTO consent_record (id, "subjectEmail", channel, purpose, action, "grantId", "textVersion", "textHash", source, "createdAt")
       VALUES ($1, $2, 'EMAIL', 'MARKETING_EMAIL', 'CONFIRMED', $5, $3, $4, 'CONFIRMATION_LINK', now() - interval '1 minute')`,
      [`e2e_${randomUUID()}`, ...base, grant],
    );
  });
}

function sendNewsletter(baseURL: string) {
  const dir = mkdtempSync(join(tmpdir(), "nl-"));
  const draft = join(dir, "draft.json");
  writeFileSync(
    draft,
    JSON.stringify({
      subject: "Nyt fra Mindforward (e2e)",
      heading: "Nyt i oktober",
      intro: "Her er månedens nyheder fra øvemiljøet.",
      items: [{ title: "Nyt modul", summary: "Et kort modul om noget nyt.", url: `${baseURL}/moduler` }],
      url: `${baseURL}/moduler`,
      approvedBy: "e2e",
      approvedAt: SEND_AT,
    }),
  );
  execFileSync("pnpm", ["exec", "tsx", "--conditions=react-server", "scripts/send-newsletter.ts", draft, "--approve", `--now=${SEND_AT}`], {
    stdio: "pipe",
    env: {
      ...process.env,
      APP_URL: baseURL,
      DATABASE_URL,
      EMAIL_TRANSPORT: "file",
      EMAIL_OUTBOX_DIR: OUTBOX_DIR,
      EMAIL_ALLOWLIST: "@example.test",
      MARKETING_EMAIL_ENABLED: "true",
      COMPANY_CVR: "12345678",
      COMPANY_ADDRESS: "Testvej 1, 8000 Aarhus C",
    },
  });
}

interface OutboxMail {
  to: string;
  template: string;
  text: string;
  from?: string;
  headers?: Record<string, string>;
}

async function newsletterTo(email: string): Promise<OutboxMail> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const f of (await readdir(OUTBOX_DIR).catch(() => [])).sort().reverse()) {
      const mail = JSON.parse(await readFile(join(OUTBOX_DIR, f), "utf8")) as OutboxMail;
      if (mail.to === email && mail.template === "newsletter") return mail;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no newsletter to ${email}`);
}

async function recorded(email: string) {
  return withDb(async (c) => {
    const withdrawn = await c.query(`SELECT source FROM consent_record WHERE "subjectEmail" = $1 AND action = 'WITHDRAWN'`, [email]);
    const hash = createHash("sha256").update(`${email}${PEPPER}`).digest("hex");
    const suppressed = await c.query(`SELECT reason FROM email_suppression WHERE "emailHash" = $1`, [hash]);
    return { withdrawn: withdrawn.rows.map((r: { source: string }) => r.source), suppressed: suppressed.rows.map((r: { reason: string }) => r.reason) };
  });
}

test.describe.configure({ timeout: 90_000 });

test("unsubscribe link in a marketing mail works without login and is recorded", async ({ browser, baseURL }) => {
  const email = newEmail();
  await confirmedConsent(email);
  sendNewsletter(baseURL ?? "");
  const mail = await newsletterTo(email);
  expect(mail.from).toContain("news.mindforward.dk");
  expect(mail.text).toContain("Markedsføring fra Mindforward");
  expect(mail.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  const link = mail.text.match(/https?:\/\/[^\s)\]]+\/afmeld\?t=[^\s)\]]+/)?.[0];
  expect(link).toBeTruthy();

  // Fresh context: no session cookie at all.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(link ?? "");
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: "Afmeld" }).click();
  await expect(page.getByText("Du er afmeldt")).toBeVisible();
  await context.close();

  expect(await recorded(email)).toEqual({ withdrawn: ["UNSUBSCRIBE_LINK"], suppressed: ["UNSUBSCRIBED"] });
});

test("one-click List-Unsubscribe POST (RFC 8058) is recorded without login", async ({ request, baseURL }) => {
  const email = newEmail();
  await confirmedConsent(email);
  sendNewsletter(baseURL ?? "");
  const mail = await newsletterTo(email);
  const target = mail.headers?.["List-Unsubscribe"]?.replace(/^<|>$/g, "") ?? "";
  expect(target).toMatch(/\/api\/afmeld\?t=/);
  const res = await request.post(target, { headers: { "content-type": "application/x-www-form-urlencoded" }, data: "List-Unsubscribe=One-Click" });
  expect(res.status()).toBe(200);
  expect(await recorded(email)).toEqual({ withdrawn: ["UNSUBSCRIBE_LINK"], suppressed: ["UNSUBSCRIBED"] });
});
