import { z } from "zod";

// Public list of sub-processors (content/legal/subprocessors.json → /underdatabehandlere, launch gate J6).
// `verified` stays false until region and transfer basis are checked in each vendor's console and DPA.

const text = z.string().min(2).max(300);

export const subprocessorsFileSchema = z.strictObject({
  version: z.string().regex(/^\d+\.\d+$/),
  updated: z.iso.date(),
  subprocessors: z
    .array(z.strictObject({ name: z.string().min(2).max(60), purpose: text, data: text, location: text, transfer: text, verified: z.boolean() }))
    .min(1),
});

export type SubprocessorsFile = z.infer<typeof subprocessorsFileSchema>;
