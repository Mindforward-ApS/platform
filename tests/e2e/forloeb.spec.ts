import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginWithCode } from "./login";

// Forløb: overview, module 1 from start to finish with the check questions, progress after reload, locked content,
// "Prøv selv" for all three kinds, phone width and keyboard use. Needs `pnpm db:seed:forloeb` on the e2e database.

interface JsonLesson {
  id: string;
  status: string;
  content?: { tryIt: { where: string }; quiz: { options: string[]; correctIndex: number } };
}
const file = JSON.parse(readFileSync("content/forloeb/forloeb.json", "utf8")) as { tracks: { id: string; levels: { modules: { lessons: JsonLesson[] }[] }[] }[] };
const module1 = (id: string) => file.tracks.find((t) => t.id === id)?.levels[0]?.modules[0]?.lessons ?? [];

// Next keeps the previous route mounted but hidden (cacheComponents), so only look at what is visible.
const vis = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function signIn(page: Page) {
  const email = `forloeb-${randomUUID().slice(0, 8)}@example.test`;
  await loginWithCode(page, email);
  await expect(page).toHaveURL(/\/hjem$/);
}

async function answerCorrectly(page: Page, lesson: JsonLesson) {
  const quiz = lesson.content?.quiz;
  if (!quiz) throw new Error(lesson.id);
  await vis(page, "quiz-option").filter({ hasText: quiz.options[quiz.correctIndex] }).click();
  await expect(vis(page, "quiz-feedback")).toHaveText("Rigtigt");
}

test("ChatGPT: oversigt, hele modul 1, fremskridt efter genindlæs og låst indhold", async ({ page }) => {
  await signIn(page);
  await page.goto("/forloeb");
  await expect(page).toHaveURL(/\/forloeb\/chatgpt$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fra helt grøn til ekspert i ChatGPT");
  await expect(vis(page, "course-stats")).toHaveText(/19 moduler.*72 lektioner.*4 certifikater.*ca\. 7 t/);
  await expect(vis(page, "course-level")).toHaveCount(4);
  await expect(vis(page, "course-module")).toHaveCount(19);
  await expect(vis(page, "course-test")).toHaveCount(4);
  await expect(vis(page, "level-meta")).toHaveText([/1 t 45 min/, /1 t 30 min/, /1 t 25 min/, /2 t 20 min/]);
  await expect(vis(page, "tool-picker").getByRole("link")).toHaveText(["ChatGPT", "Claude", "Copilot"]);
  await expect(vis(page, "course-disclaimer")).toHaveText("Mindforward er ikke tilknyttet eller godkendt af OpenAI.");
  await expect(page.locator('[data-testid="course-module"][data-status="kommer-snart"]').first()).toContainText("Kommer snart");

  // A locked lesson cannot be opened.
  await page.goto("/forloeb/chatgpt/chatgpt-l02-01");
  await expect(page.getByRole("heading", { name: "Lektionen er ikke klar endnu" })).toBeVisible();

  // Lesson 1.1: wrong answer first, then the right one.
  const lessons = module1("chatgpt");
  await page.goto(`/forloeb/chatgpt/${lessons[0].id}`);
  await expect(vis(page, "lesson-position")).toHaveText("Modul 1 · Lektion 1 af 7");
  await expect(vis(page, "try-it")).toHaveAttribute("data-where", "oevemiljoe");
  await expect(vis(page, "open-sandbox")).toHaveAttribute("href", /\/sandkasse\/chatgpt\?tekst=Forklar/);
  await vis(page, "quiz-option").filter({ hasText: "ChatGPT er hurtigere" }).click();
  await expect(vis(page, "quiz-feedback")).toHaveText("Ikke helt. Prøv igen.");
  await answerCorrectly(page, lessons[0]);

  for (const [i, lesson] of lessons.entries()) {
    if (i > 0) {
      await vis(page, "lesson-next").click();
      await expect(page).toHaveURL(new RegExp(`/forloeb/chatgpt/${lesson.id}$`));
      await expect(vis(page, "lesson-position")).toHaveText(`Modul 1 · Lektion ${i + 1} af 7`);
      const where = lesson.content?.tryIt.where;
      if (where === "tool") await expect(vis(page, "open-tool")).toHaveAttribute("href", "https://chatgpt.com");
      if (where === "offline") await expect(vis(page, "try-it").getByRole("link")).toHaveCount(0);
      await answerCorrectly(page, lesson);
    }
  }
  await vis(page, "lesson-next").click();
  await expect(page.getByRole("heading", { name: "Modul 1 er gennemført" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Tilbage til forløbet" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/forloeb\/chatgpt$/);
  await page.reload();
  await expect(vis(page, "module-progress").first()).toHaveText("7 af 7 lektioner");

  // Progress in ChatGPT does not touch Claude.
  await vis(page, "tool-picker").getByRole("link", { name: "Claude" }).click();
  await expect(page).toHaveURL(/\/forloeb\/claude$/);
  await expect(vis(page, "module-progress").first()).toHaveText("0 af 6 lektioner");
  await expect(vis(page, "course-stats")).toHaveText(/20 moduler.*81 lektioner.*ca\. 8 t/);
});

test("Copilot: værktøjslink, øvemiljø med udfyldt tekst og tastatur", async ({ page }) => {
  await signIn(page);
  const lessons = module1("copilot");
  await page.goto(`/forloeb/copilot/${lessons[2].id}`);
  await expect(vis(page, "open-tool")).toHaveText(/Åbn Copilot/);
  await expect(vis(page, "open-tool")).toHaveAttribute("href", "https://copilot.cloud.microsoft");
  await expect(vis(page, "open-tool")).toHaveAttribute("target", "_blank");

  // Keyboard: Tab to an option and answer with Enter.
  const quiz = lessons[2].content?.quiz;
  if (!quiz) throw new Error("quiz");
  const right = vis(page, "quiz-option").filter({ hasText: quiz.options[quiz.correctIndex] });
  await right.focus();
  await expect(right).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(vis(page, "quiz-feedback")).toHaveText("Rigtigt");

  await page.goto(`/forloeb/copilot/${lessons[0].id}`);
  await vis(page, "open-sandbox").click();
  await expect(page).toHaveURL(/\/sandkasse\/copilot\?tekst=/);
  await expect(page.getByRole("textbox").filter({ hasText: "Forklar i fem punkter" }).or(page.locator("textarea").filter({ hasText: "Forklar i fem punkter" })).first()).toBeVisible();
});

test("390 px: ingen vandret scroll på oversigt og lektion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  for (const path of ["/forloeb/chatgpt", "/forloeb/claude", "/forloeb/copilot", `/forloeb/chatgpt/${module1("chatgpt")[0].id}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("WCAG 2.1 AA (axe) på oversigt, lektion, låst lektion og afslutning", async ({ page }) => {
  await signIn(page);
  const first = module1("claude")[0].id;
  for (const path of ["/forloeb/claude", `/forloeb/claude/${first}`, "/forloeb/claude/claude-l02-01", "/forloeb/claude/modul/claude-m01"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations.map((v) => `${path}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  }
});
