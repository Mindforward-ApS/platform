import { z } from "zod";

// Nordlys Logistik ApS seed world (docs/04-sandkasse.md § 4). Everything is fictional:
// e-mail domains end in .example, phone numbers use the invalid +45 0000 0xxx range, dates are relative.

const exampleEmail = z.email().refine((e) => e.endsWith(".example"), "seed e-mails must use the .example TLD");
const seedPhone = z.string().regex(/^\+45 0000 0\d{3}$/, "seed phones use +45 0000 0xxx");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}\\d{2}$`));

export const employeeId = id("e");
export const mailId = id("m");
export const calendarId = id("c");
export const fileId = id("f");
export const customerId = id("k");

export const companySchema = z.strictObject({
  name: z.string(),
  description: z.string(),
  address: z.string(),
  cvr: z.string(),
  employeeCount: z.number().int(),
  facts: z.array(z.string()).min(1),
  values: z.string(),
  currentThemes: z.array(z.string()).min(1),
});

export const employeeSchema = z.strictObject({
  id: employeeId,
  name: z.string(),
  role: z.string(),
  email: exampleEmail,
  phone: seedPhone,
  isLearner: z.boolean().optional(),
});

export const mailSchema = z.strictObject({
  id: mailId,
  from: z.strictObject({ name: z.string(), email: exampleEmail }),
  to: z.array(employeeId).min(1),
  subject: z.string().min(3),
  dayOffset: z.number().int().max(0),
  time: hhmm,
  body: z.string().min(20),
  attachments: z.array(fileId).optional(),
  isPhishing: z.boolean().optional(),
  confidential: z.boolean().optional(),
  usedFor: z.string(),
});

export const calendarEventSchema = z.strictObject({
  id: calendarId,
  dayOffset: z.number().int(),
  start: hhmm,
  end: hhmm,
  title: z.string(),
  attendees: z.array(employeeId).min(1),
  externalAttendees: z.array(z.string()).optional(),
  note: z.string().optional(),
  relatedMailId: mailId.optional(),
});

export const fileSchema = z.strictObject({
  id: fileId,
  name: z.string(),
  kind: z.enum(["doc", "table", "sheet"]),
  /** Markdown/CSV body under content/sandbox-world/; the spreadsheet (kind "sheet") lives in budget.json. */
  path: z.string().regex(/^files\/[A-Za-z0-9._-]+$/).optional(),
  summary: z.string(),
  confidential: z.boolean().optional(),
}).refine((f) => (f.kind === "sheet") === (f.path === undefined), "doc/table files need a path; the sheet uses budget.json");

export const customerSchema = z.strictObject({
  id: customerId,
  name: z.string(),
  industry: z.string(),
  city: z.string(),
  segment: z.enum(["A", "B", "C"]).nullable(),
  status: z.enum(["ACTIVE", "LEAD", "TRIAL", "CANCELED"]),
  annualRevenueDkk: z.number().int().min(0),
  contactFirstName: z.string(),
  contactRole: z.string(),
  contactEmail: exampleEmail,
  lastContactDayOffset: z.number().int().max(0),
  nps: z.number().int().min(-100).max(100).nullable(),
  notes: z.string(),
  openTasks: z.array(z.string()),
});

const amount = z.number().int();
export const budgetSchema = z.strictObject({
  fileId: z.literal("f15"),
  title: z.string(),
  columns: z.tuple([z.literal("Post"), z.literal("Q1"), z.literal("Q2"), z.literal("Q3"), z.literal("Q4 (prognose)"), z.literal("I alt"), z.literal("Budget"), z.literal("Afvigelse")]),
  rows: z
    .array(
      z.strictObject({
        row: z.number().int().min(2),
        post: z.string(),
        q1: amount,
        q2: amount,
        q3: amount,
        q4: amount,
        total: amount,
        totalFormula: z.string().regex(/^=SUM\([A-H]\d+:[A-H]\d+\)$/),
        budget: amount,
        note: z.string().optional(),
      }),
    )
    .min(5),
});

export const worldSchema = z
  .strictObject({
    version: z.string().regex(/^\d+$/),
    company: companySchema,
    employees: z.array(employeeSchema).min(8),
    mail: z.array(mailSchema).length(25),
    calendar: z.array(calendarEventSchema).length(10),
    files: z.array(fileSchema).length(15),
    crm: z.array(customerSchema).length(30),
    budget: budgetSchema,
  })
  .superRefine((w, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
    const employees = ids(w.employees);
    const files = ids(w.files);
    const mails = ids(w.mail);
    for (const coll of [w.employees, w.mail, w.calendar, w.files, w.crm]) {
      if (ids(coll).size !== coll.length) issue("duplicate ids");
    }
    if (w.employees.filter((e) => e.isLearner).length !== 1) issue("exactly one employee is the learner (Kim)");
    for (const m of w.mail) {
      for (const t of m.to) if (!employees.has(t)) issue(`${m.id}: unknown recipient ${t}`);
      for (const a of m.attachments ?? []) if (!files.has(a)) issue(`${m.id}: unknown attachment ${a}`);
    }
    for (const c of w.calendar) {
      for (const a of c.attendees) if (!employees.has(a)) issue(`${c.id}: unknown attendee ${a}`);
      if (c.relatedMailId && !mails.has(c.relatedMailId)) issue(`${c.id}: unknown mail ${c.relatedMailId}`);
    }
  });

export type World = z.infer<typeof worldSchema>;
