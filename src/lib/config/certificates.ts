// Certificate levels (docs/05 § 8, content/curriculum.md "Niveau-certifikater").
// Level 1 = all Niveau 1 CORE modules for the track (minus modules the placement test marked "kan springes over",
// except core-data-01 and core-aiact-01, which are always required). Level 2/3 are added when that content exists.

export interface CertificateLevelConfig {
  level: number;
  label: string;
  /** Module slugs that must be passed (filtered per track by ModuleTrack + license tier at check time). */
  requiredModules: readonly string[];
  /** Never skippable by the placement test. */
  alwaysRequired: readonly string[];
}

export const CERTIFICATE_LEVELS: readonly CertificateLevelConfig[] = [
  {
    level: 1,
    label: "Niveau 1 · Grundlag",
    requiredModules: [
      "core-llm-01",
      "core-prompt-01",
      "core-prompt-02",
      "core-fact-01",
      "core-data-01",
      "core-policy-01",
      "core-mail-01",
      "core-meeting-01",
      "core-aiact-01",
    ],
    alwaysRequired: ["core-data-01", "core-aiact-01"],
  },
] as const;

/** Shown on the certificate ("indholdsversion"). Bump when the level-1 module set or its content changes. */
export const CERTIFICATE_CONTENT_VERSION = "pensum-2026.10";

/** Fixed text (docs/05 § 8 with the product name from § 10b). Never edit without Marco + legal review. */
export const CERTIFICATE_DISCLAIMER =
  "Certifikatet dokumenterer gennemført træning i Mindforward. Det er ikke en juridisk certificering, en offentlig godkendelse eller et krav efter AI-forordningen.";

/** Verification codes: unambiguous alphabet (no 0/O/1/I/L), 12 chars in groups of 4. */
export const VERIFICATION_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const VERIFICATION_CODE_LENGTH = 12;
