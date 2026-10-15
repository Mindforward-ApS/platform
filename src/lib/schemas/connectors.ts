import { z } from "zod";

// Connector recommendation data (content/connectors/*.json). Everything is data so it can be updated without new logic:
// industry → tasks (weights) → systems → connectors per platform. Cross-references are checked in parseConnectorContent.

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const unique = <T>(xs: T[]) => new Set(xs).size === xs.length;
const digits = z.string().regex(/^\d{2,6}$/);

export const PLATFORMS = ["CLAUDE", "CHATGPT", "COPILOT"] as const;
export const AVAILABILITY = ["OFFICIAL", "THIRD_PARTY", "NONE", "UNVERIFIED"] as const;

export const industriesFileSchema = z.array(
  z.strictObject({
    slug,
    name: z.string().min(2).max(60),
    codes: z.strictObject({ DB25: z.array(digits), DB07: z.array(digits) }),
    source: z.url({ protocol: /^https$/ }).optional(),
    note: z.string().max(400).optional(),
  }),
);

export const tasksFileSchema = z.array(z.strictObject({ slug, name: z.string().min(2).max(80) }));

export const systemsFileSchema = z.array(
  z.strictObject({ slug, name: z.string().min(2).max(60), systems: z.array(z.strictObject({ slug, name: z.string().min(2).max(60) })).min(1) }),
);

export const connectorsFileSchema = z.array(
  z.strictObject({
    slug,
    name: z.string().min(2).max(60),
    category: z.string().min(2).max(40),
    systems: z.array(slug),
    tasks: z.array(slug),
  }),
);

export const availabilityFileSchema = z.array(
  z
    .strictObject({
      connector: slug,
      platform: z.enum(PLATFORMS),
      status: z.enum(AVAILABILITY),
      sourceUrl: z.url({ protocol: /^https$/ }).nullable(),
      lastVerifiedAt: z.iso.date().nullable(),
      note: z.string().max(400).optional(),
    })
    // Never invent availability: OFFICIAL/THIRD_PARTY need a source URL and a verification date.
    .refine((a) => (a.status === "OFFICIAL" || a.status === "THIRD_PARTY" ? Boolean(a.sourceUrl && a.lastVerifiedAt) : true), {
      message: "OFFICIAL/THIRD_PARTY requires sourceUrl and lastVerifiedAt",
    }),
);

export const industryProfilesFileSchema = z.array(
  z.strictObject({
    industry: slug,
    tasks: z.array(z.strictObject({ task: slug, weight: z.number().int().min(1).max(5) })).min(1),
    systems: z.array(z.strictObject({ system: slug, preselected: z.boolean() })).min(1),
    useCases: z.array(z.strictObject({ connector: slug, text: z.string().min(10).max(240) })),
  }),
);

export const demosFileSchema = z.array(
  z.strictObject({
    slug,
    connector: slug,
    industry: slug.nullable(),
    title: z.string().min(4).max(80),
    /** Fictional data the connector "sees": named collections of small records (mails, invoices, events …). */
    data: z.record(z.string().regex(/^[a-zæøå]+$/), z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))).min(1).max(8)),
    prompt: z.string().min(10).max(600),
    outputKind: z.enum(["SUMMARY", "DRAFT", "TABLE", "LIST"]),
  }),
);

export type ConnectorContent = {
  industries: z.infer<typeof industriesFileSchema>;
  tasks: z.infer<typeof tasksFileSchema>;
  systems: z.infer<typeof systemsFileSchema>;
  connectors: z.infer<typeof connectorsFileSchema>;
  availability: z.infer<typeof availabilityFileSchema>;
  profiles: z.infer<typeof industryProfilesFileSchema>;
  demos: z.infer<typeof demosFileSchema>;
};

/** Parses all files and checks every cross-reference (slugs exist, no duplicates, no ambiguous code prefix). */
export function parseConnectorContent(raw: Record<keyof ConnectorContent, unknown>): ConnectorContent {
  const c: ConnectorContent = {
    industries: industriesFileSchema.parse(raw.industries),
    tasks: tasksFileSchema.parse(raw.tasks),
    systems: systemsFileSchema.parse(raw.systems),
    connectors: connectorsFileSchema.parse(raw.connectors),
    availability: availabilityFileSchema.parse(raw.availability),
    profiles: industryProfilesFileSchema.parse(raw.profiles),
    demos: demosFileSchema.parse(raw.demos),
  };
  const errors: string[] = [];
  const industries = new Set(c.industries.map((i) => i.slug));
  const tasks = new Set(c.tasks.map((t) => t.slug));
  const systems = new Set(c.systems.flatMap((g) => g.systems.map((s) => s.slug)));
  const connectors = new Set(c.connectors.map((x) => x.slug));
  const check = (ok: boolean, msg: string) => void (ok || errors.push(msg));

  check(unique(c.industries.map((i) => i.slug)), "duplicate industry slug");
  check(unique(c.tasks.map((t) => t.slug)), "duplicate task slug");
  check(unique([...systems]) && systems.size === c.systems.flatMap((g) => g.systems).length, "duplicate system slug");
  check(unique(c.connectors.map((x) => x.slug)), "duplicate connector slug");
  check(unique(c.demos.map((d) => d.slug)), "duplicate demo slug");
  for (const sys of ["DB25", "DB07"] as const) {
    const prefixes = c.industries.flatMap((i) => i.codes[sys]);
    check(unique(prefixes), `${sys}: a code prefix maps to two industries`);
  }
  for (const x of c.connectors) {
    for (const s of x.systems) check(systems.has(s), `connector ${x.slug}: unknown system ${s}`);
    for (const t of x.tasks) check(tasks.has(t), `connector ${x.slug}: unknown task ${t}`);
  }
  for (const a of c.availability) check(connectors.has(a.connector), `availability: unknown connector ${a.connector}`);
  check(unique(c.availability.map((a) => `${a.connector}:${a.platform}`)), "availability: duplicate connector × platform");
  for (const p of c.profiles) {
    check(industries.has(p.industry), `profile: unknown industry ${p.industry}`);
    for (const t of p.tasks) check(tasks.has(t.task), `profile ${p.industry}: unknown task ${t.task}`);
    for (const s of p.systems) check(systems.has(s.system), `profile ${p.industry}: unknown system ${s.system}`);
    for (const u of p.useCases) check(connectors.has(u.connector), `profile ${p.industry}: unknown connector ${u.connector}`);
  }
  for (const d of c.demos) {
    check(connectors.has(d.connector), `demo ${d.slug}: unknown connector ${d.connector}`);
    check(d.industry === null || industries.has(d.industry), `demo ${d.slug}: unknown industry ${d.industry}`);
  }
  if (errors.length) throw new Error(`content/connectors: ${errors.join("; ")}`);
  return c;
}
