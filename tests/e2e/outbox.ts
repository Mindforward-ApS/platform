import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const OUTBOX_DIR = process.env.EMAIL_OUTBOX_DIR ?? ".e2e-outbox";

interface OutboxMail {
  to: string;
  subject: string;
  text: string;
  template: string;
}

/** Waits for the newest mail of a template to an address (written by the file transport) and returns its first link. */
export async function waitForLink(to: string, template: "magic-link" | "invitation", timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = (await readdir(OUTBOX_DIR).catch(() => [])).sort().reverse();
    for (const f of files) {
      const mail = JSON.parse(await readFile(join(OUTBOX_DIR, f), "utf8")) as OutboxMail;
      if (mail.to === to.toLowerCase() && mail.template === template) {
        const url = mail.text.match(/https?:\/\/[^\s)\]]+/)?.[0];
        if (url) return url;
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No ${template} mail to ${to} within ${timeoutMs} ms`);
}
