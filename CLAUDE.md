# CLAUDE.md — Greb

Greb er en dansk SaaS, hvor medarbejdere lærer AI-værktøjer (ChatGPT, Microsoft 365 Copilot og Claude — senere Gemini) ved at **gøre ting** i en neutral sandkasse med den fiktive virksomhed "Nordlys Logistik ApS".
Kort niveautest → personlig modulplan → praktiske opgaver med score, hints og certifikat → månedlig genopfriskning, der holdes ajour af en indholdsmotor.
Kunder: virksomheder (seats, admin, dokumentationsrapport efter AI-forordningens art. 4) og privatpersoner. Solo-founder: Marco.

## Gyldne regler
1. `docs/00-beslutninger.md` er sandheden. Afsnit 10 "Rettelser" og 10a går forud for resten (10a vinder ved konflikt). Er noget i strid med den, følger du den og noterer konflikten i `docs/OPEN-QUESTIONS.md`.
2. Byg én milestone ad gangen fra `docs/11-roadmap.md`. Ingen arbejde uden for milestonens scope.
3. Plan før kode: filliste + tilgang → vent på Marcos godkendelse → tests først for logik → kode → checks.
4. Ingen gætterier: er en beslutning uklar eller virker forkert, stop og skriv den i `docs/OPEN-QUESTIONS.md`. Improvisér ikke.
5. Juridiske regler (forbrugeraftaleloven, markedsføringsloven, GDPR, varemærker) er krav, ikke forslag. Se `docs/10-compliance.md`.
6. Design er besluttet (Mindforward-designsystemet, godkendt af Marco 14. okt. 2026, se 00-beslutninger § 10d). Brug UI-kittet i `src/components/ui/` og tokens fra `src/styles/tokens.css`.

## Dokumentkort — hvilket dokument til hvilken opgave
| Opgave | Læs |
|---|---|
| Alt (altid) | `CLAUDE.md`, `docs/00-beslutninger.md`, din milestone i `docs/11-roadmap.md` |
| Fakta, lovparagraffer, kilder | `docs/research-fund.md` |
| Arbejdsgang, prompt-skabeloner | `docs/00-START-HER.md` |
| Produkt, flows, skærme | `docs/01-produkt.md` |
| Arkitektur, mappestruktur i detaljer, integrationer | `docs/02-arkitektur.md` |
| Datamodel, Prisma | `docs/03-datamodel.md`, `prisma/schema.prisma` |
| Sandkasse, skins, Nordlys-verdenen, PII-filter | `docs/04-sandkasse.md` |
| Moduler, trintyper, scoring, hints, rubric | `docs/05-moduler-og-scoring.md`, `content/schema/module.schema.json`, `content/modules/core-prompt-01.json`, `content/curriculum.md` |
| Indholdsmotor (release notes → moduler) | `docs/06-indholdsmotor.md` |
| Stripe, priser, forbrugerflows | `docs/07-betaling.md` |
| Supportagent, hjælpecenter, eskalering | `docs/08-support.md` |
| Email, samtykke, marketing | `docs/09-email-og-marketing.md` |
| Lov, GDPR, varemærker, launch gate | `docs/10-compliance.md` |
| Miljøvariabler | `.env.example` |
| Forretning, priser, mål (kontekst — ikke byggekrav) | `forretningsplan.md` |

## Stack (verificér aktuelle versioner + docs før installation)
Next.js App Router · TypeScript strict · Prisma · Neon Postgres (AWS Frankfurt) · Vercel (function region `fra1`) · Anthropic API · Better Auth (magic link, Microsoft Entra ID, Google, organizations) · Stripe (kort; ingen Stripe Tax i MVP) · Resend · Inngest (jobs + cron) · PostHog EU Cloud · Sentry · Zod · Tailwind + shadcn/ui-primitiver · Vitest · Playwright · pnpm.

## Kommandoer
```
pnpm dev          # lokal udvikling
pnpm build        # produktionsbuild
pnpm test         # Vitest (unit + integration)
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # seed: spor, moduler, Nordlys Logistik
pnpm e2e          # Playwright
pnpm content:validate  # validér content/ mod schema (fra M2)
```
Før hver PR: `pnpm typecheck && pnpm lint && pnpm test` grønne; `pnpm e2e` for berørte flows.

## Mappestruktur (detaljer i docs/02-arkitektur.md)
```
src/app/            # routes, layouts, server actions (UI), route handlers (webhooks, cron, Inngest)
src/server/         # domænelogik, kun server: auth/, billing/, modules/, scoring/, sandbox/, email/, content-engine/, support/, jobs/
src/server/ai/      # ALLE LLM-kald: klient, model-config, budget, prompts/ (versionerede)
src/lib/            # delte, rene hjælpere (Zod-skemaer, formatering, config) — ingen secrets
src/components/     # UI-komponenter (shadcn-primitiver + egne)
src/styles/tokens.css  # ENESTE sted for design-tokens (placeholder)
content/            # schema/, modules/, sandbox-world/ (Nordlys), curriculum.md
prisma/             # schema.prisma, migrations/, seed.ts
tests/              # unit/, e2e/ (Playwright), fixtures/
docs/               # spec + OPEN-QUESTIONS.md
```

## Konventioner
- TypeScript strict. Ingen `any` (brug `unknown` + Zod). Ingen `@ts-ignore` uden begrundet kommentar.
- **Zod ved hver grænse:** form-input, server actions, route handlers, webhooks, LLM-output, modul-JSON, env (`src/lib/env.ts`), eksterne API-svar.
- **Server actions** til UI-mutationer. **Route handlers** til webhooks (Stripe, Resend), cron og Inngest. Ingen forretningslogik i komponenter.
- **LLM-kald kun via `src/server/ai/`.** Model-id'er i config (ikke i koden ved kaldet). Prompts versioneres i `src/server/ai/prompts/` (fx `grade-prompt-task.v1.ts`); prompt-version + model-id gemmes på hvert resultat, der afhænger af dem.
- **Hvert eksternt kald** (Anthropic, Stripe, Resend, e-conomic, kildesider) har timeout, retry med backoff (kun idempotente kald) og struktureret logging (uden PII/secrets).
- Prisma ejer entitetsnavnene (se 00-beslutninger.md § 9). Opfind ikke nye navne for eksisterende begreber.
- UI-tekst på dansk via i18n-laget, aldrig hardcodet i komponenter. Kode, identifiers, commits, kommentarer: engelsk.
- Priser, planer, grænser og feature-flags i config/DB — aldrig i komponenter.
- Spor (`Track`) og Copilot-niveauer (`COPILOT_CHAT`, `COPILOT_M365`) er data. Funktionsnavne i værktøjerne (Plugins, Skills, Gems …) er data fra indholdsmotoren; pensum er begrebsbaseret.

## Omkostningsregler
- Én lille model som standard; større model kun hvor docs eksplicit siger det (fx verifikator i indholdsmotoren).
- Prompt caching på alle gentagne system-prompts/rubrics.
- Dagligt token-loft pr. bruger + samlet månedligt loft med alarm ved 80 % (mål ca. 5.000–10.000 kr/md ved 10.000 brugere). Lofter i config; overskridelse giver venlig besked, ikke crash.
- Al forbrug logges pr. kald (bruger, org, feature, model, tokens).
- Marketing-/annonceautomatik: **hårdt loft 20.000 kr/md** håndhævet i kode, ikke kun i annonceplatformen.

## Sikkerhed og privatliv
- Authz-helper (fra `src/server/auth/`) kaldes i **hver** server action og route handler. Ingen undtagelser.
- **Org-scoping på hver query** mod org-data (`organizationId` i where). Test cross-org-adgang.
- Ingen secrets klientside. Kun `NEXT_PUBLIC_*` må nå browseren, og kun ikke-hemmelige værdier.
- Webhooks: verificér signatur (Stripe, Resend m.fl.) før parsing; idempotent håndtering.
- Rate limits på alle AI-endpoints (sandkasse, bedømmelse, support).
- PII-filter klient- og serverside i sandkassen (CPR, kortnumre, kontonumre m.m.): advar/blokér før LLM-kald.
- **Admins ser status, score og certifikater — aldrig medarbejdernes prompt-tekster.** Prompt-tekster slettes efter 30 dage (cron).
- `AuditLog` for admin-handlinger, rolleændringer, abonnementsændringer, indholdspublicering.

## Test
- **Unit (Vitest), skrives før koden:** scoring (≥ 80 %, bedste forsøg, must-pass `JUDGMENT`, hint trin 3 = 0 point), PROMPT_TASK-bedømmelse (deterministiske checks + rubric-parsing med mocket LLM), priser/entitlements (B2C, B2B min. 5 seats, prøveperiode, gratis moduler), samtykke-gate (ingen MARKETING uden gyldigt `ConsentRecord`), budgetlofter (pr. bruger, globalt, 80 %-alarm, marketing 20.000 kr).
- **E2E (Playwright):** signup, checkout inkl. "Fortryd aftale", gennemfør et modul, invitér medarbejder, opsig abonnement. Stripe i testmode; LLM mocket i e2e.
- Ingen netværkskald til rigtige tredjeparter i tests.

## Definition of done
- [ ] Alle acceptkriterier i milestonen opfyldt og rapporteret med bevis (testnavn, kommando-output, skærmbillede/preview-URL).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` grønne; `pnpm e2e` grøn for berørte flows.
- [ ] Ny logik har tests; ingen `any`; Zod ved nye grænser; authz + org-scoping på nye endpoints.
- [ ] Migrationer committet; seed virker på tom database.
- [ ] `.env.example` og relevante docs opdateret, hvis adfærd/konfiguration er ændret.
- [ ] Usikkerheder skrevet i `docs/OPEN-QUESTIONS.md`.
- [ ] Vercel preview virker, så Marco kan teste.

## Usikkerhedsregel
Verificér aktuelle library-docs (API'er, versioner, model-id'er) før installation eller brug — din viden kan være forældet. Virker en beslutning forkert, umulig eller modstridende: **stop**, tilføj den til `docs/OPEN-QUESTIONS.md` (spørgsmål, kontekst, dit forslag, hvad der er blokeret) og spørg Marco. Improvisér ikke.

## Designregel
- Designsystemet er **besluttet**: https://claude.ai/artifact/XQwYFamA9HLSbaAbYRhMyf (brandbog, tokens, komponenter). Forbillede: Stripe — roligt, præcist, én farve der betyder noget.
- Farver, fonte, skygger og radier defineres **kun** i `src/styles/tokens.css` (håndhæves af `pnpm check:tokens`). Komponenter bruger Tailwind-navnene (`bg-surface`, `text-ink-muted`, `text-title-1` …), aldrig rå værdier.
- Byg med UI-kittet: `src/components/ui/primitives.tsx` (Page, Card, Button/ButtonLink, Field, Badge, Notice, Table …), `icons.tsx`, `brand.tsx`; skaller i `src/components/shell/`.
- Én primær knap pr. visning. Kanter før skygger. Status aldrig med farve alene. Ingen emoji, gradienter eller farvede venstrekanter.
- Sandkassen har egen visuel identitet. Skins spejler kun layout-regioner og generiske menubegreber. Aldrig leverandørernes logoer, farver, fonte, ikoner, skærmbilleder eller "look and feel".
- Fast disclaimer i sandkassen: "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google." Svar mærkes "Øvemodel".

## Git
- Små commits med Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).
- Én milestone pr. PR, branch `m<N>-<kort-navn>`. Aldrig direkte push til `main`.
- PR-beskrivelse: acceptkriterier som tjekliste med bevis + åbne spørgsmål.

## ALDRIG
- Hardcode priser (49 kr m.fl. kommer fra config/DB).
- Sende MARKETING-email uden at gå gennem samtykke-gaten (gyldigt `ConsentRecord` + dobbelt opt-in).
- Lægge tilbud, rabatter eller upsell i påmindelses- eller andre SERVICE-mails.
- Lade sandkassen kalde rigtige tredjepartstjenester (mail, kalender, CRM, OpenAI, Microsoft …). Alt kører mod Nordlys-data.
- Bruge leverandørernes logoer, farver, skærmbilleder eller trade dress i UI.
- Auto-publicere `CORE`-moduler eller moduler, der kræver ny sandkasse-UI.
- Bruge rigtige kundedata i sandkassen eller i seed/tests.
- Springe webhook-signaturverifikation over.
- Påstå "AI Act-certificering", "lovkrav om certificering", "påkrævet niveau" eller bruge bødetrusler. Budskab: "dokumenteret, rollebaseret tiltag efter art. 4".
- Påstå at ChatGPT/Copilot/Claude/Gemini svarer i sandkassen.
- Vise medarbejderes prompt-tekster til admins.
- Lave falske nedtællere eller "kun i dag"-tilbud.
