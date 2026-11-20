"use server";

import { revalidatePath } from "next/cache";
import type { CalendarItem } from "@/lib/calendar";
import { createEventInput, deleteEventInput, rangeInput, updateEventInput, type CreateEventPayload, type RangePayload, type UpdateEventPayload } from "@/lib/schemas/calendar";
import { AuthzError, requireActiveMembership } from "@/server/auth/authz";
import { createEvent, deleteEvent, listCalendar, updateEvent } from "@/server/calendar/service";
import { db } from "@/server/db";

// Kalender: load a range and change the learner's own events. Always the caller's active membership; an event of
// another user (or another org) is NOT_FOUND.

type Fail = { ok: false; error: "UNAUTHORIZED" | "INVALID" | "NOT_FOUND" };
export type ItemsResult = { ok: true; events: CalendarItem[] } | Fail;
export type ItemResult = { ok: true; event: CalendarItem } | Fail;
export type DoneResult = { ok: true } | Fail;

// No return type annotation: the authz scan (tests/unit/authz-scan.test.ts) only recognises unannotated local guards.
async function signedIn() {
  try {
    const ctx = await requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]);
    return { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  } catch (err) {
    if (err instanceof AuthzError) return null;
    throw err;
  }
}

export async function loadCalendarRange(payload: RangePayload): Promise<ItemsResult> {
  const owner = await signedIn();
  if (!owner) return { ok: false, error: "UNAUTHORIZED" };
  const parsed = rangeInput.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  return { ok: true, events: await listCalendar(db(), owner, parsed.data) };
}

export async function createCalendarEvent(payload: CreateEventPayload): Promise<ItemResult> {
  const owner = await signedIn();
  if (!owner) return { ok: false, error: "UNAUTHORIZED" };
  const parsed = createEventInput.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const event = await createEvent(db(), owner, parsed.data);
  revalidatePath("/kalender");
  return { ok: true, event };
}

export async function updateCalendarEvent(payload: UpdateEventPayload): Promise<ItemResult> {
  const owner = await signedIn();
  if (!owner) return { ok: false, error: "UNAUTHORIZED" };
  const parsed = updateEventInput.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const r = await updateEvent(db(), owner, parsed.data);
  if (!r.ok) return r;
  revalidatePath("/kalender");
  return { ok: true, event: r.item };
}

export async function deleteCalendarEvent(payload: { id: string }): Promise<DoneResult> {
  const owner = await signedIn();
  if (!owner) return { ok: false, error: "UNAUTHORIZED" };
  const parsed = deleteEventInput.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  if (!(await deleteEvent(db(), owner, parsed.data.id))) return { ok: false, error: "NOT_FOUND" };
  revalidatePath("/kalender");
  return { ok: true };
}
