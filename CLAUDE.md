# CLAUDE.md — MindForward (kodenavn: greb)

MindForward er en dansk SaaS, hvor medarbejdere lærer AI-værktøjer (ChatGPT, Microsoft 365 Copilot og Claude — senere Gemini) ved at **gøre ting** i en neutral sandkasse med den fiktive virksomhed "Nordlys Logistik ApS".
Pensum har fem indgange: Fundamental AI, AI Act og ansvarlig brug samt de tre værktøjsspor. Et kontekstbibliotek (privat og erhverv) gør undervisningen personlig uden for sandkassen.
Kort niveautest → personlig modulplan → praktiske opgaver med score, hints og certifikat → månedlig genopfriskning, der holdes ajour af en indholdsmotor.
Kunder: virksomheder (seats, admin, dokumentationsrapport efter AI-forordningens art. 4) og privatpersoner. Solo-founder: Marco.

## Gyldne regler
1. `docs/00-beslutninger.md` er sandheden. Afsnit 10 "Rettelser", 10a, 10b og 10c går forud for resten (nyeste vinder ved konflikt: 10c > 10b > 10a > 10). Er noget i strid med den, følger du den og noterer konflikten i `docs/OPEN-QUESTIONS.md`.
2. Byg én milestone ad gangen fra `docs/11-roadmap.md`. Ingen arbejde uden for milestonens scope.
3. Plan før kode: filliste + tilgang → vent på Marcos godkendelse → tests først for logik → kode → checks.
4. Ingen gætterier: er en beslutning uklar eller virker forkert, stop og skriv den i `docs/OPEN-QUESTIONS.md`. Improvisér ikke.
5. Juridiske regler (forbrugeraftaleloven, markedsføringsloven, GDPR, varemærker) er krav, ikke forslag. Se `docs/10-compliance.md`.
6. Design er ikke besluttet. Byg funktion med neutrale placeholders — ikke færdigt look.

## Dokumentkort — hvilket dokument til hvilken opgave
| Opgave | Læs |
|---|---|
| Alt (altid) | `CLAUDE.md`, `docs/00-beslutninger.md`, din milestone i `docs/11-roadmap.md` |
| Fakta, lovparagraffer, kilder | `docs/research-fund.md` |
| Læringsresearch og erfaringer fra AI Minds (kontekst — ikke byggekrav) | `docs/research/README.md` |
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
Før hvert push til `main`: `pnpm typecheck && pnpm lint && pnpm test` grønne; `pnpm e2e` for berørte flows.

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
- [ ] Vercel-deploy fra `main` virker, så Marco kan teste.

## Usikkerhedsregel
Verificér aktuelle library-docs (API'er, versioner, model-id'er) før installation eller brug — din viden kan være forældet. Virker en beslutning forkert, umulig eller modstridende: **stop**, tilføj den til `docs/OPEN-QUESTIONS.md` (spørgsmål, kontekst, dit forslag, hvad der er blokeret) og spørg Marco. Improvisér ikke.

## Designregel
- Design er **IKKE** besluttet. Brug neutrale placeholder-tokens kun i `src/styles/tokens.css` (farver, typografi, radius, spacing). Ingen farver/fonte direkte i komponenter.
- Marco designer skærm for skærm og vælger mellem **flere visuelle versioner**. Byg ikke et færdigt design i blinde, og lås ikke standard-layouts fast.
- Sandkassen har egen visuel identitet. Skins spejler kun layout-regioner og generiske menubegreber. Aldrig leverandørernes logoer, farver, fonte, ikoner, skærmbilleder eller "look and feel".
- Fast disclaimer i sandkassen: "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google." Svar mærkes "Øvemodel".

## Git
- Små commits med Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).
- Der arbejdes og pushes direkte på `main` (push til `main` deployer til produktion på Vercel). Kør checks før hvert push.
- Milestone-rapport (i chatten): acceptkriterier som tjekliste med bevis + åbne spørgsmål.

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
- Vise individuelle ranglister, eller vise en medarbejders streak eller ugentlige tjek-ind til admin (kun samlede tal, mindst 5 svar).
- Sende kontekstbiblioteket til sandkassen, øvemodellen eller bedømmelsen (det bruges kun til personalisering uden for sandkassen), eller lade det indeholde kundedata, andres persondata eller CPR-/kort-/kontonumre.
- Lade personaliseret tekst ændre score, spørgsmål, certifikat eller rapport, eller omskrive virksomhedens AI-politik/dataregler (vises ordret).
- Kalde noget "AI Act-certifikat" — "AI Act" er navnet på et emneområde, ikke et bevis.
- Lade hints (trin 1–2) eller feedback aflevere det færdige svar.
- Lave falske nedtællere eller "kun i dag"-tilbud.
