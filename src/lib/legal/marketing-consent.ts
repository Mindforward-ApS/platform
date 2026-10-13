// Canonical marketing consent text (docs/09 § 2, v1; "Greb" → "Mindforward" per docs/00 § 10b).
// The source of truth is content/legal/marketing-consent.v1.md — `pnpm content:validate` and a unit test fail
// if this constant drifts from the file. Bundled as a constant so runtime never depends on reading content/.
// Final wording awaits legal review ([JURA: verificeres]). A wording change = new version file + new constant.

export const MARKETING_CONSENT = {
  version: "marketing-consent.v1",
  file: "content/legal/marketing-consent.v1.md",
  text: "Ja tak, Mindforward må sende mig tips om AI på arbejdet, nyheder om Mindforward og tilbud på Mindforwards abonnementer på email. Jeg kan altid afmelde mig med ét klik.",
} as const;
