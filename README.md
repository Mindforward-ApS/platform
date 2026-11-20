# Greb — byggespecifikation til Claude Code

Komplet spec-pakke til at bygge **Greb**: dansk SaaS hvor medarbejdere lærer ChatGPT, Microsoft 365 Copilot og Claude ved at gøre ting i en sandkasse. Ingen kode endnu — Claude Code bygger den milestone for milestone (M0–M10).

**Start:** læs `docs/00-START-HER.md` og indsæt kickoff-prompten i Claude Code.

| Fil | Indhold |
|---|---|
| `CLAUDE.md` | Regler, konventioner og ALDRIG-liste — Claude Code læser den altid |
| `docs/00-beslutninger.md` | Kanoniske beslutninger (afsnit 10 går forud) |
| `docs/research-fund.md` | Verificerede fakta + kilder (lov, marked, værktøjer) |
| `docs/00-START-HER.md` | Konti før M0, arbejdsgang, prompt-skabeloner |
| `docs/01-produkt.md` | Produkt, flows, skærme |
| `docs/02-arkitektur.md` · `docs/03-datamodel.md` · `prisma/schema.prisma` · `.env.example` | Arkitektur og data |
| `docs/04-sandkasse.md` | Sandkasse, skins, Nordlys Logistik, PII-filter |
| `docs/05-moduler-og-scoring.md` · `content/` | Moduler, trintyper, scoring, schema, eksempelmodul, pensum |
| `docs/06-indholdsmotor.md` | Release notes → auto-opdaterede moduler |
| `docs/07-betaling.md` · `docs/08-support.md` · `docs/09-email-og-marketing.md` | Betaling, support, email/samtykke |
| `docs/10-compliance.md` | Lov, GDPR, varemærker, launch gate |
| `docs/11-roadmap.md` | Milestones M0–M10 med acceptkriterier og designsessioner |
| `forretningsplan.md` | Forretningsplan (kontekst, ikke byggekrav) |

## Udvikling (fra M0)

Kræver Node 24 og pnpm 10.

```bash
pnpm install                 # kører også prisma generate
cp .env.example .env.local   # udfyld mindst APP_URL og DATABASE_URL (Neon, Frankfurt)
pnpm dev                     # http://localhost:3000
pnpm inngest:dev             # Inngest Dev Server på :8288 (sæt INNGEST_DEV=1)
```

Checks før PR: `pnpm typecheck && pnpm lint && pnpm check:tokens && pnpm test && pnpm build && pnpm e2e`.
