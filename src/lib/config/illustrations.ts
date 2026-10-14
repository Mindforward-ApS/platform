// Which 3D illustration (public/illustrations/<name>.webp, CC0 3dicons) belongs to which module.
// Presentation config only; unknown modules fall back to a stable pick from FALLBACK.

export const ILLUSTRATIONS = [
  "bulb", "chart", "chat-bubble", "chat-text", "computer", "explorer", "file-text", "flash", "key", "lock", "magic-trick",
  "mail", "medal", "notebook", "pencil", "puzzle", "rocket", "shield", "target", "tick", "trophy",
] as const;
export type IllustrationName = (typeof ILLUSTRATIONS)[number];

const BY_MODULE: Record<string, IllustrationName> = {
  "core-aiact-01": "shield",
  "core-data-01": "lock",
  "core-fact-01": "target",
  "core-llm-01": "bulb",
  "core-mail-01": "mail",
  "core-meeting-01": "notebook",
  "core-policy-01": "file-text",
  "core-prompt-01": "chat-bubble",
  "core-prompt-02": "rocket",
};

const FALLBACK: IllustrationName[] = ["puzzle", "key", "pencil", "chat-text", "flash", "magic-trick", "explorer"];

export function illustrationForModule(slug: string): IllustrationName {
  const known = BY_MODULE[slug];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length]!;
}

// Photographic covers (public/covers/<slug>.webp): premium object shots on a soft tinted backdrop with empty space
// on the left (Marco 14 Oct 2026). A module with a photo uses it instead of the 3D illustration.
const COVER_PHOTOS = new Set<string>([
  "core-aiact-01",
  "core-data-01",
  "core-fact-01",
  "core-llm-01",
  "core-mail-01",
  "core-meeting-01",
  "core-policy-01",
  "core-prompt-01",
  "core-prompt-02",
]);

export function coverPhoto(slug: string): string | null {
  return COVER_PHOTOS.has(slug) ? `/covers/${slug}.webp` : null;
}
