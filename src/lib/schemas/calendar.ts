import { z } from "zod";

// Kalender server-action input. Strict objects: unknown fields are rejected, never ignored.

export const CALENDAR_MAX_MINUTES = 12 * 60;
export const CALENDAR_MAX_RANGE_DAYS = 62;

const id = z.string().regex(/^[a-z0-9]{10,40}$/i);
const title = z.string().trim().min(1).max(120);
const type = z.enum(["LESSON", "PRACTICE", "MEETING"]);
const instant = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
// Internal paths only ("/forloeb/chatgpt/x"); no scheme, no protocol-relative "//host".
const href = z.string().max(200).regex(/^\/(?!\/)[A-Za-z0-9\-_/]*$/);

export type SpanError = "ENDS_BEFORE_START" | "TOO_LONG";

/** endsAt after startsAt and at most 12 hours later. */
export function spanError(startsAt: Date, endsAt: Date): SpanError | null {
  const ms = endsAt.getTime() - startsAt.getTime();
  if (ms <= 0) return "ENDS_BEFORE_START";
  if (ms > CALENDAR_MAX_MINUTES * 60_000) return "TOO_LONG";
  return null;
}

function refineSpan(v: { startsAt?: Date; endsAt?: Date }, ctx: z.RefinementCtx) {
  if (!v.startsAt || !v.endsAt) return;
  const err = spanError(v.startsAt, v.endsAt);
  if (err) ctx.addIssue({ code: "custom", message: err, path: ["endsAt"] });
}

export const createEventInput = z.strictObject({ title, type, startsAt: instant, endsAt: instant, href: href.nullable().optional() }).superRefine(refineSpan);

/** Move, resize, rename or retype: at least one field. A lone startsAt/endsAt is checked against the stored row. */
export const updateEventInput = z
  .strictObject({ id, title: title.optional(), type: type.optional(), startsAt: instant.optional(), endsAt: instant.optional() })
  .refine((v) => v.title !== undefined || v.type !== undefined || v.startsAt !== undefined || v.endsAt !== undefined, { message: "EMPTY" })
  .superRefine(refineSpan);

export const deleteEventInput = z.strictObject({ id });

export const rangeInput = z.strictObject({ from: instant, to: instant }).superRefine((v, ctx) => {
  const ms = v.to.getTime() - v.from.getTime();
  if (ms <= 0 || ms > CALENDAR_MAX_RANGE_DAYS * 86_400_000) ctx.addIssue({ code: "custom", message: "RANGE", path: ["to"] });
});

export type CreateEventInput = z.output<typeof createEventInput>;
export type UpdateEventInput = z.output<typeof updateEventInput>;
export type CreateEventPayload = z.input<typeof createEventInput>;
export type UpdateEventPayload = z.input<typeof updateEventInput>;
export type RangePayload = z.input<typeof rangeInput>;
