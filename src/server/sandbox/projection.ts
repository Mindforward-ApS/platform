import "server-only";
import type { SandboxProps } from "@/components/sandbox/types";
import type { PrismaClient, SandboxSession } from "@/generated/prisma/client";
import { loadChatTurns, sessionState, type Owner } from "./service";
import { loadSkin } from "./skin";
import { buildSheetCells } from "./tools";
import { formatDayLabel, loadWorld, resolveDay } from "./world";

/** Seed world + session overlay → serializable props for the sandbox UI (own session only). */
export async function buildSandboxProps(db: PrismaClient, owner: Owner, session: SandboxSession): Promise<SandboxProps> {
  const world = loadWorld();
  const state = sessionState(session);
  const anchor = session.createdAt;
  const label = (dayOffset: number) => formatDayLabel(resolveDay(anchor, dayOffset));
  const employee = (id: string) => world.employees.find((e) => e.id === id)?.name ?? id;
  const conversationId = state.chat.active.id;
  const turns = conversationId ? await loadChatTurns(db, owner, session.id, { conversationId, limit: 40 }) : [];

  return {
    sessionId: session.id,
    skin: loadSkin(session.skinKey),
    initialState: state,
    conversationId,
    turns: turns.map((t) => ({ seq: t.seq, role: t.role, text: t.text })),
    world: {
      mail: [...world.mail]
        .sort((a, b) => b.dayOffset - a.dayOffset || b.time.localeCompare(a.time))
        .map((m) => ({ id: m.id, fromName: m.from.name, fromEmail: m.from.email, to: m.to.map(employee), subject: m.subject, dateLabel: label(m.dayOffset), time: m.time, body: m.body, attachments: (m.attachments ?? []).map((f) => world.files.find((x) => x.id === f)?.name ?? f) })),
      calendar: [...world.calendar]
        .sort((a, b) => a.dayOffset - b.dayOffset || a.start.localeCompare(b.start))
        .map((c) => ({ id: c.id, dayOffset: c.dayOffset, dateLabel: label(c.dayOffset), start: c.start, end: c.end, title: c.title, attendees: [...c.attendees.map(employee), ...(c.externalAttendees ?? [])], ...(c.note ? { note: c.note } : {}) })),
      files: world.files.map((f) => ({ id: f.id, name: f.name, kind: f.kind, summary: f.summary, confidential: Boolean(f.confidential), ...(world.fileBodies[f.id] ? { body: world.fileBodies[f.id] } : {}) })),
      crm: world.crm.map((k) => {
        const v = state.crm.values[k.id] ?? {};
        return {
          id: k.id,
          name: k.name,
          industry: k.industry,
          city: k.city,
          segment: (typeof v.segment === "string" && v.segment !== "NONE" ? v.segment : k.segment) as "A" | "B" | "C" | null,
          status: (typeof v.status === "string" ? v.status : k.status) as "ACTIVE" | "LEAD" | "TRIAL" | "CANCELED",
          annualRevenueDkk: typeof v.annualRevenueDkk === "number" ? v.annualRevenueDkk : k.annualRevenueDkk,
          contact: `${k.contactFirstName}, ${k.contactRole}`,
          nps: typeof v.nps === "number" ? v.nps : k.nps,
        };
      }),
      sheet: buildSheetCells(world, state),
    },
  };
}
