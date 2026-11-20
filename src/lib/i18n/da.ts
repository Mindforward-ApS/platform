// Danish UI strings. Components never hardcode UI text (CLAUDE.md) — add keys here.
export const da = {
  meta: {
    title: "MindForward",
    description: "Få greb om AI — lær ved at gøre.",
  },
  home: {
    heading: "MindForward",
    tagline: "Få greb om AI. Kommer snart.",
    deployCheck: "Deploy-test 20. november 2026",
  },
} as const;

export type Messages = typeof da;
