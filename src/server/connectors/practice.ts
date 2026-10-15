import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { scoreConnectors } from "./scoring";
import { getWorkProfile } from "./service";

// Practice connectors for the øvemiljø: the industry's connectors grouped into NEUTRAL kinds ("Regnskabsprogram",
// "Kundesystem" …) so the sandbox never shows vendor names (docs/04 § 3). Each kind gets the industry's best use case
// and an example-data demo. The real, named catalogue lives outside the sandbox (/profil/anbefalinger).

/** Connector.category → neutral practice kind (i18n keys in da-sandbox.ts → practice.kinds). */
export const PRACTICE_KIND: Record<string, PracticeKind> = {
  Kontor: "office",
  Filer: "files",
  Samarbejde: "chat",
  Projekter: "projects",
  Kunder: "crm",
  Webshop: "shop",
  Betaling: "payments",
  Design: "design",
  Regnskab: "accounting",
  Håndværk: "jobs",
  Automatisering: "automation",
};
export type PracticeKind = "office" | "files" | "chat" | "projects" | "crm" | "shop" | "payments" | "design" | "accounting" | "jobs" | "automation";

export interface PracticeConnector {
  kind: PracticeKind;
  useCase: string | null;
  demo: { id: string; title: string; prompt: string; data: Record<string, Record<string, string | number | boolean>[]> } | null;
}

export async function practiceConnectorsFor(db: PrismaClient, scope: { userId: string; organizationId: string }): Promise<{ industry: string; items: PracticeConnector[] } | null> {
  const profile = await getWorkProfile(db, scope);
  if (!profile?.industryId || !profile.industry) return null;
  const industryId = profile.industryId;
  const [tasks, connectors, useCases, demos] = await Promise.all([
    db.industryTask.findMany({ where: { industryId }, select: { taskId: true, weight: true } }),
    db.connector.findMany({ select: { id: true, name: true, category: true, tasks: { select: { taskId: true } }, systems: { select: { systemId: true } } } }),
    db.industryConnectorUseCase.findMany({ where: { industryId }, select: { connectorId: true, text: true } }),
    db.connectorDemo.findMany({ where: { industryId }, select: { id: true, connectorId: true, title: true, prompt: true, data: true } }),
  ]);
  // Availability does not matter in practice: rank on the industry's tasks and the learner's systems only.
  const scored = scoreConnectors({
    tasks,
    selectedSystemIds: profile.selectedSystemIds,
    platform: "CLAUDE",
    connectors: connectors.map((c) => ({ id: c.id, name: c.name, taskIds: c.tasks.map((t) => t.taskId), systemIds: c.systems.map((s) => s.systemId), availability: {} })),
  });
  const useCase = new Map(useCases.map((u) => [u.connectorId, u.text]));
  const category = new Map(connectors.map((c) => [c.id, c.category]));
  const ranked = [...scored.recommended, ...scored.unavailable].sort((a, b) => b.score - a.score).filter((c) => useCase.has(c.id) || c.matchedSystemIds.length > 0);

  const items = new Map<PracticeKind, PracticeConnector>();
  for (const c of ranked) {
    const kind = PRACTICE_KIND[category.get(c.id) ?? ""];
    if (!kind) continue;
    const current = items.get(kind);
    const demo = demos.find((d) => d.connectorId === c.id);
    if (!current) {
      items.set(kind, { kind, useCase: useCase.get(c.id) ?? null, demo: demo ? { id: demo.id, title: demo.title, prompt: demo.prompt, data: demo.data as NonNullable<PracticeConnector["demo"]>["data"] } : null });
    } else if (!current.demo && demo) {
      current.demo = { id: demo.id, title: demo.title, prompt: demo.prompt, data: demo.data as NonNullable<PracticeConnector["demo"]>["data"] };
    }
  }
  return { industry: profile.industry.name, items: [...items.values()].slice(0, 6) };
}
