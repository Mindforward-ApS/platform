# Åbne spørgsmål

> Uafklarede punkter. Claude Code tilføjer nye her i stedet for at improvisere (se CLAUDE.md).
> Format: spørgsmål · kontekst · forslag · hvad det blokerer.

## Til Marco / advokat (før launch)
- [ ] **Er Greb "digitalt indhold" eller en "tjenesteydelse"** efter forbrugeraftaleloven? Afgør om afkald på fortrydelsesret ved straks-adgang virker. Blokerer: endelig tekst i B2C-checkout (M6).
- [ ] **Advokatgennemgang:** handelsbetingelser, databehandleraftale, privatlivspolitik, sandkassens UI (trade dress), art. 4-tekster. Blokerer: launch gate (M10).
- [ ] **Ansættelseskontrakt hos Færch & Co.:** klausuler om bibeskæftigelse og immaterielle rettigheder. Blokerer: pilot.
- [ ] **Navn og domæne "Greb"** er ikke tjekket (domæne, varemærke). Blokerer: M0 (domæne).
- [ ] **Dansk tilsynsmyndighed for AI-forordningens art. 4** er uafklaret (L 111 bortfaldt). Påvirker kun markedsføringstekster.

## Tekniske (fra spec-arbejdet 12. okt 2026)
- [x] **`prisma validate` er ikke kørt** (M0: kørt 13. okt 2026 — skemaet er gyldigt med Prisma 7.10) — npm var ikke tilgængeligt i miljøet hvor spec blev skrevet. Kør `npx prisma validate` + `npx prisma format` i M1 og ret fejl. Skemaet følger Prisma 7 (datasource-url i `prisma.config.ts`, driver adapter, seed køres ikke automatisk ved migrate).
- [ ] **Better Auth + Prisma 7:** pakkenavn for adapteren (`@better-auth/prisma-adapter` vs. import fra `better-auth/adapters/prisma`). Diff Better Auth-tabeller mod `npx auth@latest generate` i M1.
- [x] **Vercel-region:** standard er `iad1` → sæt `"regions": ["fra1"]` i `vercel.json` (M0).
- [ ] **Feltnavne på `StepResult`:** `docs/05-moduler-og-scoring.md` nævner `graderModelId`, `graderPromptVersion`, `criteriaScores`. Prisma bruger `modelId`, `promptVersion`, `rubricScores`. **Prisma vinder** — ret 05 i M4.
- [ ] **Fortrydelser:** `docs/07-betaling.md` foreslår `AuditLog`; Prisma har en dedikeret `WithdrawalRequest`. **Brug `WithdrawalRequest`** (AuditLog logger desuden handlingen).
- [ ] **Seed-data:** `content/sandbox-world/` skal indeholde mailen med id `nordlys-mail-hansen-byg-4471` ("Forsinket levering – ordre 4471"), som `content/modules/core-prompt-01.json` refererer til (M2).
- [ ] **Golden set mangler:** `content/golden/core-prompt-01/prompt-svarmail.jsonl` (≥ 20 mærkede svar) skal laves før `core-prompt-01` publiceres (M4).
- [ ] **Grundforløb (`ProgramDefinition`)** er ikke i Prisma-skemaet — fase 2, når pakken til kompetencefondene bygges.
- [ ] **Anthropic model-id'er og priser** verificeres i M3 mod aktuel dokumentation; sæt forbrugsgrænse i Anthropic-konsollen fra dag 1.
- [ ] **Event-navne:** sandkassens events er UPPER_SNAKE (fx `UI_CLICKED`, `CHAT_FILE_ATTACHED`) som i `docs/04-sandkasse.md`. 05, modulskemaet og eksempelmodulet er rettet til dette.

## Fra kickoff-gennemgang (13. okt 2026)

### M0 — versioner og opsætning
- [x] **Prisma-version:** `npm prisma@latest` er 8.0.0-rc; `@better-auth/prisma-adapter` kræver Prisma ≤ 7. · Forslag: lås `prisma`/`@prisma/client`/adapter på 7.10.x. · Blokerer: M0.
- [x] **TypeScript-version:** `typescript@latest` er 7.0; `typescript-eslint` kræver `<6.1`. · Forslag: lås TS 6.0.x. · Blokerer: M0 (lint).
- [x] **Next.js 16:** `middleware.ts` hedder nu `proxy.ts`; `next lint` er fjernet. · Forslag: 02 § 2/§ 7 læses som `proxy.ts`; `pnpm lint` = `eslint .`. · Blokerer: intet.
- [x] **Env-validering i M0:** hvis `env.ts` kræver alle variabler fra `.env.example` (Stripe, Anthropic …), kan M0-preview ikke starte. · Forslag: Zod-skema med grupper; kun M0-variabler (DB, Sentry, Inngest, APP_URL) er påkrævede nu, resten tilføjes som påkrævede i den milestone der bruger dem. · Blokerer: M0.
- [x] **Prisma-skema i M0:** M0 har ingen domænemodeller, men `prisma/schema.prisma` er hele spec-skemaet (ikke valideret). · Forslag: M0 kører `prisma validate` på spec-skemaet og retter syntaksfejl, men laver ingen migration; health-route bruger `SELECT 1`. Første migration i M1. · Blokerer: M0.

### BLOCKER (før M2/M4)
- [ ] **CORE-moduler på flere spor:** `Module` har ét `trackId` + unik `slug`, men `core-prompt-01.json` har `tracks: [CHATGPT, COPILOT, CLAUDE, GEMINI]`. · Forslag: join-tabel `ModuleTrack`. · Blokerer: M2-seed.
- [ ] **Target-id-format:** schema `targetId` = kebab-case med punktum (`nav.new-chat`); 04 § 9 bruger `nav.newChat` + `mail:m08`; 05 § 3 bruger `nordlys-fragtrapport-q3` hvor seed er `f13`. · Forslag: ét format (kebab + punktum: `nav.new-chat`, `mail.m08`), ret 04/05/schema/Prisma-kommentar samlet. · Blokerer: M3/M4.
- [ ] **Launch-gate-features uden milestone:** GDPR-eksport/-sletning (10 § 1.5), DPA-accept før første invitation (10 § 1.2), juridiske sider + cookiebanner (10 § 8), info til medarbejder ved første login (10 § 1.6), 2FA for GREB_ADMIN (10 § 7). · Forslag: 2FA → M1; jura-sider + cookiebanner → M5; DPA, første-login-info, eksport/sletning → M7. · Blokerer: launch.

### HIGH
- [ ] **Claude mangler stadig flere steder:** 11 linje 155 (designsession nævner kun CHATGPT/COPILOT), 04 § 5 (skin-tillæg i `sandbox-chat-skin.v1`), 01 § 4.2.2, 08 (supportagentens systemprompt + eval 18), 10 § 4, curriculum (Grundforløb). · Forslag: tilføj Claude alle steder.
- [ ] **Plan-krav for Claude/ChatGPT:** schema har kun Copilot-specifikt `requiresTier`; 04/curriculum lover plan-mærkat. · Forslag: generisk `requiresPlan {status, values[]}` i schema + Prisma, eller drop mærkat i MVP.
- [ ] **Grading-loft:** 05 § 7 siger delt token-loft med sandkassen; 04 § 11 + `.env` har separat `AI_USER_DAILY_GRADING_CAP`. · Forslag: separat (ret 05).
- [ ] **Retention 03 vs. 10:** anonym niveautest 30 vs. 90 dage; AuditLog 5 vs. 2 år; B2B-org efter ophør 30 dage hard delete vs. 90 dage read-only + varsel. · Forslag: 10 vinder; bevis-handlinger i AuditLog 5 år. **[JURA]**
- [ ] **Hvem må betale/opsige/ændre seats (B2B):** 01 + 07 § 4.3 siger OWNER/ADMIN; 07 § 8.7/§ 14 siger kun OWNER. · Forslag: kun OWNER.
- [ ] **Definition af seat:** 07 § 3 = aktive learners; 03 § 3 = alle memberships + åbne invitationer. Påvirker min. 5 og prøve-loft. · Forslag: definér i 07, 03 henviser.
- [x] **B2C-opsigelse:** besluttet 13. okt 2026 — fra dag til dag, adgang resten af betalt løbende måned (00 § 10).
- [ ] **B2C-årsplan (490 kr):** med reglen ovenfor skal en årskunde have resten af året refunderet ved opsigelse. · Forslag: ingen B2C-årsplan i MVP (kun 49 kr/md), eller forholdsmæssig refusion. · Blokerer: M2 plan-seed, M6. **[JURA]**
- [ ] **Certifikat offentligt som standard:** `publicVerificationEnabled @default(true)` vs. 01 "valgfri". · Forslag: `false` (opt-in, GDPR art. 25).
- [ ] **Kunde-admin under `/admin`:** 10 § 1.5 bruger `/admin/data`, men `/admin` er Grebs interne drift. · Forslag: `/virksomhed/data`.
- [ ] **`FetchMode`:** 06 `PLAIN|BROWSER_FALLBACK|MANUAL_ONLY` vs. Prisma `DIRECT|BROWSER_FALLBACK`; `license` vs. `attribution`. · Forslag: Prisma vinder, ret 06.
- [ ] **Eksempelmoduler passer ikke til Nordlys-verdenen:** "ny på kundeservice" vs. Kim Lund (kunde-/salgskoordinator); "disponent Mette Lund" findes ikke; Hansen Byg findes ikke i CRM; faste datoer; vedhæftning af mail. · Forslag: brug eksisterende kunde (fx Bølgegrøn Kaffe) eller tilføj Hansen Byg; relative datoer. · Blokerer: M2/M4.
- [ ] **Roadmap-rækkefølge:** M6 e2e kræver seat-loft på invitationer (M7); M8 kræver NEWS-moduler (M9); M2 kræver PII-filter (M3); M6 opretter Escalation (indbakke M10). · Forslag: seat-loft til M6; M8 tester med fixture-NEWS; regex-test i M2; simpel mail til `SUPPORT_INBOX` i M6.
- [ ] **Annonceautomatik:** krævet af 00/CLAUDE.md/09/10, men roadmap siger "kun hvis". Ingen env-variabler for Google/Meta Ads. · Beslutning til Marco: egen milestone eller fase 2.
- [ ] **Manglende Prisma-felter:** `Invitation` (spor, jobrolle, licens), `Organization` (AI-politik-link, standardspor, påmindelsespolitik, rapport-noter), `HelpArticle`, outreach/Robinson-model. · Forslag: tilføj i M2.

### LOW
- [ ] Escalation-status (08 `WAITING_ON_CUSTOMER` vs. Prisma `IN_PROGRESS`); 05 `GRADING_FAILED` vs. `GradingStatus.ERROR`; grader-timeout 15 s vs. 20 s/30 s.
- [ ] `ConsentSource`-værdier afviger mellem 09 og Prisma.
- [ ] To forskellige marketing-samtykketekster (01 § 4.1.4 vs. 09 § 2) → én kanonisk i `content/legal/`.
- [ ] Marketing-afsenderdomæne: 09 kræver `news.`-domæne; `.env.example` har `nyt@mail.…`.
- [ ] Underdatabehandlerliste mangler Upstash/Turnstile/CVR-API/Vercel Blob/Google/Meta/e-conomic/Pairy/GitHub; 05 nævner Upstash, 02 Postgres-`RateLimit`.
- [ ] 07 § 10 "ingen ny tabel" vs. `WebhookEvent`; `Subscription.organizationId` unik vs. partiel index.
- [ ] Navne: `anonymousId`/`anonymousTokenHash`; `MonthlyCycle` pr. bruger vs. pr. (måned, spor); `/certifikat/[id]` vs. `<code>`; certifikatsidens indhold; `src/config/limits.ts` vs. `src/lib/config/limits.ts`; `simulatedAt` vs. `simulatedDayOffset`.
- [ ] 00 § 5 nævner stadig Stripe Tax (§ 10 vinder); § 9 mangler de 11 ekstra entiteter fra 03 § 1.
- [ ] `forretningsplan.md` vil bruge MFL § 10 stk. 2; 09 siger ikke i MVP.
