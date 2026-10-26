# Åbne spørgsmål

> Uafklarede punkter. Claude Code tilføjer nye her i stedet for at improvisere (se CLAUDE.md).
> Format: spørgsmål · kontekst · forslag · hvad det blokerer.

## Til Marco / advokat (før launch)
- [ ] **Er Greb "digitalt indhold" eller en "tjenesteydelse"** efter forbrugeraftaleloven? Afgør om afkald på fortrydelsesret ved straks-adgang virker. Blokerer: endelig tekst i B2C-checkout (M6).
- [ ] **Advokatgennemgang:** handelsbetingelser, databehandleraftale, privatlivspolitik, sandkassens UI (trade dress), art. 4-tekster. Blokerer: launch gate (M10).
- [ ] **Ansættelseskontrakt hos Færch & Co.:** klausuler om bibeskæftigelse og immaterielle rettigheder. Blokerer: pilot.
- [x] **Navn og domæne:** produktet hedder Mindforward, domænet mindforward.dk er købt (00 § 10b).
- [ ] **Varemærke "Mindforward":** mindforward.com og .eu bruges af andre (formål ukendt). Tjek DKPTO/EUIPO. Blokerer: launch gate.
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

## M1 — Auth, organisationer, roller (plan 13. okt 2026)
- [ ] **Afsenderdomæne til Resend:** magic link kan ikke testes på preview uden et verificeret domæne (Resend sender ellers kun til kontoens egen mail). "Greb"-domænet er ikke tjekket. · Forslag: midlertidigt subdomæne på et domæne Marco ejer (fx `mail.<eksisterende-domæne>`), skift når Greb-domænet er købt. · Blokerer: M1-accept "magic link virker på preview".
- [ ] **2FA for GREB_ADMIN:** Better Auths twoFactor-plugin kræver adgangskode for at slå 2FA til og gater ikke magic link/SSO som standard. · Forslag: Greb har ingen adgangskoder → egen TOTP step-up for GREB_ADMIN (tabellen `TwoFactor` + `Session.twoFactorVerifiedAt`), krævet af `requirePlatformAdmin()`. Verificér først om pluginnet har passwordless-tilstand. · Blokerer: intet (kun Marcos egen konto).
- [ ] **Microsoft-email er ikke verificeret for alle konti** (Better Auth-docs): automatisk kontosammenkobling på email kan misbruges. · Beslutning (forsigtig): ingen auto-linking fra Microsoft; Google kun når `email_verified=true`.
- [ ] **OAuth på preview-URL'er:** Microsoft/Google kræver faste redirect-URI'er, preview-URL'er skifter. · Forslag: Better Auths `oauth-proxy`-plugin (OAuth går via produktions-URL og tilbage til preview).
- [ ] **PERSONAL-org ved signup:** skal en inviteret B2B-medarbejder også få en PERSONAL-org? · Forslag: nej — PERSONAL-org oprettes kun ved første login *uden* medlemskab og uden ventende invitation (ikke i `user.create.after`, som 02 § 3 siger).
- [ ] **Delvis migration i M1:** spec-skemaet indeholder alle tabeller med relationer på tværs. · Forslag: M1 migrerer kun auth/org/audit/email-tabeller fra et beskåret skema; hele spec-skemaet gemmes som `prisma/spec/schema.full.prisma` og resten migreres i M2.
- [ ] **CSP med nonce (M5):** Next streamer `<Suspense>`-indhold med inline-scripts; en statisk `script-src`/`default-src` blokerer siderne. M1 har derfor kun `base-uri`, `object-src`, `frame-ancestors`, `form-action` + HSTS m.fl. · Forslag: nonce-CSP i `proxy.ts` sammen med de offentlige sider i M5 (koster dynamisk rendering af alle sider — vurderes mod performance-budgettet). · Blokerer: intet.
- [x] **E-mail via Inngest-kø (02 § 5 `email.send`):** M1 sender synkront via HTTP-hjælperen (timeout + retry) med Resends idempotency-key, og logger alt i `EmailMessage`. Magic links er tidskritiske, så en kø giver ingen værdi her. Kø tilføjes, når der kommer mails uden en ventende bruger (M8).

## M2 — Datamodel + seed (13. okt 2026)
- [x] **CVR-tjek af kundenavne (04 § 4):** alle 30 navne slået op via cvrapi.dk; ingen eksakte match. k14 "Havblik Fiskeudstyr" omdøbt til "Saltvind Fiskeudstyr" (findes "HAVBLIK ApS"). Nærmeste øvrige: "Vindrose Rejser A/S" (anden branche), "Sneglehuset Lund ApS" — beholdt.
- [x] **Fejl i `module.schema.json`:** `quizStep` havde `if/then` på samme niveau som `unevaluatedProperties`, så Ajv afviste gyldige multi-select-quizzer. `if/then` er flyttet ind i `allOf` (samme betydning).
- [x] **`core-prompt-01` rettet til Nordlys-verdenen:** case = Bølgegrøn Kaffes klage (m02), vedhæftning = f11 "Tone of voice", ugedage i stedet for datoer, kontakt = Kim Lund.
- [ ] **Golden set for `core-prompt-01`** mangler stadig (≥ 20 mærkede svar) → modulet seedes som `IN_REVIEW` og publiceres først, når golden set findes (M4).
- [ ] **`prerequisites: core-llm-01`** peger på et modul, der ikke er skrevet endnu (kun anbefaling, blokerer ikke).

## M4 — Modulafspiller, scoring, hints (13. okt 2026)
- [ ] **Heltals-point i Prisma:** `Attempt.points` og `StepResult.points` er `Int`, men scoring regner med decimaler (fx 20,6). · Valgt: modulscore genberegnes med fuld præcision ud fra gemte svar/rubric-scores ved afslutning; `points` gemmes afrundet, `scorePct` med 2 decimaler. · Forslag: `Decimal(6,2)` hvis der skal rapporteres præcise point.
- [ ] **PROMPT_TASK lukkes ved bestået:** efter bestået vises eksempelløsningen (05 § 2), så yderligere indsendelser ville kunne kopiere den. · Valgt: trinnet lukker ved bestået eller når `maxSubmissions` er brugt.
- [ ] **Hint efter indsendelse:** hint-niveau er pr. trin; tages hint 2/3 på en PROMPT_TASK, der stadig kan genindsendes, gælder multiplikatoren også den bedste indsendelse. Lukkede trin tager ingen nye hints.
- [ ] **Grader permanent nede:** `GradingStatus.ERROR` holder trinnet åbent (ingen 0 point), men brugeren kan ikke afslutte modulet før en bedømmelse lykkes. `grading.retry`-jobbet (02 § 5) er ikke bygget. · Forslag: byg sammen med AI-gatewayen (M3-integration).
- [ ] **CLICK_TASK-events pr. trin:** evaluatoren læser `SandboxEvent` med `stepId = trinnets id` for sessioner bundet til forsøget (i stedet for "seq > trinnets start-seq", som ikke er gemt). Sandkassen (M3) skal sætte `stepId` på events.
- [ ] **Grader-prompt-placering:** `grade-prompt-task.v1.ts` ligger i `src/server/scoring/` (ikke `src/server/ai/prompts/`), fordi M3 bygger `src/server/ai/` parallelt. Kan flyttes uden versionsbump.
- [ ] **Svartid-flag (05 § 7):** `StepResult.flags.fastAnswer` sættes ikke endnu (kræver visningstidspunkt pr. trin).

## M6 — Stripe-betaling + forbrugerflows (13. okt 2026)
### Til advokat [JURA]
- [ ] **Digitalt indhold vs. tjenesteydelse** (uændret, blokerer endelig ordlyd): checkbokse-teksterne står som udkast i `content/legal/checkout-consent.v1.json`. "Fortryd aftale" og fuld refusion er bygget uanset svaret.
- [ ] **Refusionsregel ved fortrydelse:** MVP refunderer det fulde beløb for den betalte måned straks via Stripe (ingen forholdsmæssig betaling for leveret ydelse). Gentagen fortrydelse fra samme email → abonnement stoppes, refusion afventer manuel vurdering (eskalation). Er det i orden, og hvad er lovens refusionsfrist?
- [ ] **Hostet Stripe Checkout efter "Køb":** vores side har knappen "Køb" + fed pris inkl. moms + de to checkbokse; derefter sendes kunden til Stripes hostede betalingsside, hvis egen knap Stripe styrer ("Abonner"/"Betal"). Er § 12-kravet opfyldt, når bindingen sker ved "Køb" hos os? Ellers: skift til `ui_mode: "elements"` (Payment Element på vores side, vores "Køb" kalder `checkout.confirm()`) — kræver publishable key og @stripe/stripe-js.
- [ ] **Fristberegning:** "Fortryd aftale" vises fra købet til udgangen af dag 14 efter købsdagen (Europe/Copenhagen), fx køb 1. okt → synlig til og med 15. okt 23:59. Korrekt?
- [ ] **Ordrebekræftelse som varigt medium:** mailen indeholder sælger, plan, pris inkl. moms, frekvens, automatisk fornyelse, startdato, samtykketekster med tidspunkt, fortrydelsesfrist + link og opsigelsesvejledning, men **ingen PDF med handelsbetingelser** (betingelserne findes ikke endnu, M5) — kun link til `/vilkaar/forbruger`. Standardfortrydelsesformular mangler også i mailen.
- [ ] **Sælgeroplysninger:** `COMPANY_CVR` og `COMPANY_ADDRESS` skal udfyldes i Vercel før launch (vises i ordrebekræftelse og kvittering).

### Tekniske / til Marco
- [ ] **Ordrebekræftelse sendes på `checkout.session.completed`** (ikke `invoice.paid` som 07 § 8.3), fordi samtykkerne er bundet til checkout-sessionens id. Idempotensnøgle `stripe:{sessionId}:order-confirmation`.
- [ ] **Seat-ned midt i perioden** sker straks med `proration_behavior: "none"` (ingen kreditering), ikke planlagt til periodens udløb (07 § 4.3). Altid ≥ 5 og ≥ pladser i brug.
- [ ] **Seat-loft tæller ejeren med** (00 § 10a): i prøveperioden er ejer + 4 invitationer = 5 pladser; den næste (6. plads) afvises. 07 § 15 siger "6. invitation".
- [ ] **Udløbet B2B-prøve (paused) → køb:** den pausede prøve opsiges og der oprettes et nyt abonnement via Checkout (i stedet for `subscriptions.resume`). Løbende prøve → kort via Checkout `mode: "setup"` og samme abonnement konverteres (`trial_end: "now"`).
- [ ] **Customer Portal-konfiguration** (`scripts/stripe-setup.ts`, 07 § 4.4) og oprettelse af Products/Prices/Tax Rates er ikke lavet — der var ingen Stripe-nøgler. Kræves før rigtig betaling. Stripe-nøgler valideres først ved brug (ikke ved boot), så andre milestones' previews starter uden dem.
- [ ] **Dunning-mails, trial-mails (dag 11/13), `charge.dispute.created`-alarm og `customer.updated`-sync** er ikke bygget i M6 (kun status-sync + banner). Foreslås til M8 (mails) / M10 (alarmer).
- [ ] **Race på seat-loft:** to samtidige invitationer kan i sjældne tilfælde begge passere (hook kører uden lås). Acceptabelt i MVP.
- [ ] **Eskalationer:** `Escalation`-række + SERVICE-mail til `SUPPORT_INBOX` (allowlist gælder uden for produktion).

## M3 — Sandkasse-motor (13. okt 2026)
- [x] **Overlay-id'er og targets følger 10a:** `asst-…`, `auto-…`, `conv-…`, `draft-…` (bindestreg, ikke `asst_…` som i 04 § 9), targets `nav.new-chat`, `mail.m08`, `file.f13`, `crm.k12`, `cal.c04`, `asst.<id>`, `auto.<id>`, `composer.attach`, `connectors.<id>.connect`.
- [x] **Predikat-evaluatoren** ligger i `src/server/sandbox/assertions.ts` (opgaven), ikke `src/server/modules/predicate.ts` (05 § 3). M4 kan re-eksportere den derfra.
- [x] **Seed-verden og skins læses fra `content/` ved runtime** (fs + `outputFileTracingIncludes` i `next.config.ts`) i stedet for JS-imports, så Turbopack ikke skal have en raw-loader til .md/.csv. Zod-valideres én gang pr. proces.
- [ ] **Prompt caching på Haiku 4.5:** minimumslængden for et cachebart prefix er model-afhængig (op til 4.096 tokens). System-prompt + skin-tillæg + verdensresumé er ca. 2–3k tokens og bliver måske ikke cachet. · Forslag: mål `cache_read_input_tokens` på preview; udvid evt. verdensresuméet (ikke padding) eller accepter det. · Blokerer: intet.
- [ ] **Fallback-model:** `AI_MODEL_FALLBACK` er tom som standard (= ingen fallback), da en større model strider mod omkostningsreglen. · Forslag: Marco vælger, om fallback skal være en anden lille model. · Blokerer: intet.
- [ ] **Ikke bygget i M3 (følger med modulafspiller/M4+):** model-værktøjer med side-effekt (`mail_draft/send`, `calendar_create`, `crm_update`, `sheet_write`, `files_create`) med godkendelseskort, agent-flow (kun stub), "Spol frem" for planlagte opgaver, scener (`content/sandbox-world/scenes/`), chat-evals live på preview. Global månedsloft-blokering/80 %-alarm er M10 (forbrug registreres allerede på `BudgetMonth(GLOBAL_AI)`).
- [ ] **Global Prisma-`omit` af `SandboxEvent.contentText` (02 § 7)** er ikke indført, da `src/server/db.ts` er delt; sandkassens queries vælger felter eksplicit, og kun `loadChatTurns` (ejer-tjekket) læser `contentText`. · Forslag: indfør global omit samlet med `StepResult.promptText` i M4.
- [ ] **WARN i assistent-/automationsformularer** viser serverens besked i stedet for modal (kun chatten har "Ret teksten"/"Det er fiktivt — fortsæt"-modalen i M3).

## M5 — Niveautest + læringsplan + leadmagnet (13. okt 2026)
- [ ] **[JURA] Samtykketekst v1** (`content/legal/marketing-consent.v1.md`): 09 § 2-teksten er valgt som kanonisk (01 § 4.1 har en anden ordlyd); "Greb" → "Mindforward" jf. 10b. Afklar: skal selskabsnavn (Esther Gruppen ApS) stå i selve teksten, og er "tilbud på abonnementer" specifik nok? Ny ordlyd = ny versionsfil.
- [ ] **[JURA] Juridiske sider** (`/privatliv`, `/cookies`, `/handelsbetingelser`, `/tilgaengelighed`) er pladsholdere mærket "Udkast — afventer advokatgennemgang"; teksten ligger i `src/lib/i18n/da-placement.ts`, ikke i `content/legal/` (10 § 8). Flyttes dertil med versionering, når advokaten har godkendt. Task-ruten `/handelsbetingelser` afviger fra 10 § 8 (`/vilkaar/forbruger` + `/vilkaar/virksomhed`) — én side med to afsnit indtil videre.
- [ ] **[JURA] Cookiebanner:** kun nødvendige cookies i dag (session, cookievalg, niveautest-nøgle). Kræver det overhovedet et banner, når intet ikke-nødvendigt bruges? Banneret er bygget (10a) og gemmer valget 180 dage — bekræft varighed.
- [ ] **[JURA] Opbevaring af anonym niveautest:** 03 siger 30 dage, 10 siger 90 dage; cookien lever 30 dage. Sletjobbet (`retention.purge-misc`) er M4/M10 — ikke bygget i M5.
- [ ] **Dobbelt opt-in kræver et klik på en knap** på `/samtykke/bekraeft` (ikke kun GET på linket), så mailscannere ikke kan bekræfte på brugerens vegne. Afmelding: samme mønster + RFC 8058 one-click på `POST /api/afmeld?t=…`.
- [ ] **Allerede bekræftet adresse:** en ny tilmelding laver ingen ny GRANTED-række (den ville slå samtykket fra), og formularen svarer ens, så den ikke afslører, om en adresse er tilmeldt. Et nyt bekræftet samtykke fjerner en tidligere `UNSUBSCRIBED`-suppression (aldrig bounce/klage).
- [ ] **Plan-rækkefølge i Niveau 1:** "de 3 gratis moduler først" (curriculum) og "usikker → øverst" kan kollidere. Valgt: gratis-modulerne først (medmindre de kan springes over), derefter moduler fra usikre områder, så resten, og "kan springes over" sidst. Bekræft.
- [ ] **Moduler findes endnu ikke:** kun `core-prompt-01` er seedet (IN_REVIEW, intet golden set). Planen bygges derfor fra `content/placement/catalog.v1.json` (fra curriculum.md); `Assignment`s oprettes kun for publicerede moduler, resten vises som "Kommer snart". Planen gensynkroniseres ikke automatisk, når nye moduler publiceres — forslag: kør `applyPlacementPlan` igen ved publicering (M4/M9).
- [ ] **Område-tærskler** (sikker = alle rigtige, usikker < 50 %, niveau 2 ≥ 50 %, niveau 3 ≥ 80 %) og minimumtid 10 s er antagelser i `src/lib/config/placement.ts`.
- [ ] **`/plan` er bygget i M5** (01 § 4.1 trin 6). Overlap med M4's modulafspiller mulig ved merge.
- [ ] **CSP med nonce** (punktet under M1) er ikke lavet i M5 — ikke en del af opgaven; stadig åbent.

## M9 — Indholdsmotor (13. okt 2026)
- [ ] **Verifikator-model i gatewayen:** `src/server/ai/models.ts` giver `CONTENT_CLASSIFY/DRAFT/VERIFY` alle `AI_MODEL_DEFAULT`; `CONTENT_*_MODEL` læses ikke. Motoren kræver en anden model til verify (config-tjek + model-id fra svaret) og afviser ellers alt — dvs. intet auto-publiceres, før models.ts mapper `CONTENT_VERIFY_MODEL` (og draft/classify) fra env. · Forslag: M3/integrator tilføjer env-felterne i `ModelEnv` og bruger dem i `modelConfig`.
- [ ] **Parser-selectors er bedste bud** (`content/sources.json`: `article` + `h2/h3` for Intercom, `##/###` for Learn, roadmap-JSON-felter fra API v1). Ikke verificeret mod live-sider (ingen netværk i tests). 0 entries → alarm + FAILED. · Forslag: kør "Hent nu" på preview pr. kilde og justér `parser` + bump `version`.
- [ ] **Cloudflare (help.openai.com, support.claude.com):** headless browser-fallback er kun et injicerbart interface (`browserFetch`), ikke bygget (ingen Playwright i Vercel-funktioner). Blokeres siden → kilden `DEGRADED` og Marco kan indsætte release notes manuelt på `/admin/indhold`.
- [ ] **`/bot`-side** (ærlig User-Agent peger på den, 06 § 2) er ikke bygget. `CONTENT_USER_AGENT` skal sættes til `GrebContentBot/1.0 (+https://mindforward.dk/bot; hej@mindforward.dk)` el.lign.
- [ ] **Skema-huller (ingen migration i M9):** `ContentSource` mangler felt til parser-konfiguration (læses fra `content/sources.json` via nøgle); `ModuleVersion(changeEventId, draftAttempt)` er unik, så impact-kladder af berørte CORE-moduler kan ikke linkes til ChangeEvent (linkes via `pipelineRunId` + `ChangeEvent.affectedModuleIds`); `ChangeEventStatus` har ingen `BASELINE` (baseline gemmes som `kind=BASELINE, status=SKIPPED`); review-årsager + issue-URL ligger i `ModuleVersion.verifyReport` (`{ verify, reviewReasons, issueUrl }`); ingen `STALE`-status (bruger `Module.isStale`).
- [ ] **Daglige lofter** (classify 60, draft 10, verify 20) tælles approksimativt fra DB (klassificerede ChangeEvents / AUTO-versioner i dag); `content.change-process` kører med concurrency 1.
- [ ] **"Automatisk opdateret [dato] — kilde: [link]"** sættes som `autoUpdatedAt` + `sources[0].url` (+ CC BY-`attribution`) i modul-JSON; selve mærkatet i modulafspilleren (M4/M8) er ikke tegnet endnu — tekst ligger i `da-content.ts` (`generated.autoUpdated`).

## M7 — Admin-dashboard, invitationer, rapport, certifikater (13. okt 2026)
### Til advokat [JURA]
- [ ] **[JURA] Databehandleraftale** (`content/legal/dpa.v1.md`) er en pladsholder ("Udkast — afventer advokatgennemgang"). Accept gemmer navn, titel, CVR, tidspunkt, version + sha256 af teksten i `AuditLog(DPA_ACCEPTED)`. PDF-kopi til OWNER (10 § 1.2) er ikke bygget. Ny tekst = ny versionsfil + `DPA_VERSION`; skal eksisterende kunder genacceptere?
- [ ] **[JURA] Info ved første login** (`/konto/data-info`): teksterne i `src/lib/i18n/da-admin.ts` (`firstLogin`) linker til `/privatliv`; "kundens egen privatlivstekst" har intet felt endnu (kun `aiPolicyUrl`).
- [ ] **[JURA] Eksport (`GET /api/me/export`)** leverer JSON straks (synkront) i stedet for ZIP på mail med 7-dages link (10 § 1.5). Forsøg inkl. brugerens egne prompt-tekster (< 30 dage) er med, da det er brugerens egne data. Certifikat-PDF'er er ikke i eksporten (kan hentes på `/certifikater`). Rate limit 1/døgn.
- [ ] **[JURA] Sletning:** bevis-tabeller beholder rækker med `userId = null`, men `EmailMessage.toEmail` og `ConsentRecord.subjectEmail` står stadig i klar tekst (bevis). Afklar om de skal hashes ved sletning. Admin får ingen mail, når en medarbejder sletter sin konto — kun `AuditLog(USER_ERASED)` i org'en.
- [ ] **[JURA] Rapportens ordlyd** ("Dokumentation af AI-kompetencetiltag · Dokumenteret, rollebaseret tiltag efter art. 4 i AI-forordningen") — godkend. Virksomhedens egne noter afvises, hvis de indeholder certificering/lovkrav/påkrævet niveau/bøder (så den genererede tekst aldrig gør).
### Tekniske / til Marco
- [ ] **Skemahuller (ingen migration i M7):** (1) `Organization` mangler udløb for invitationslinket (`joinLinkExpiresAt`) — linket virker til det nulstilles/slås fra; (2) intet felt til virksomhedens rapport-noter — de skrives pr. eksport og gemmes ikke; (3) `verifiedDomain` er `@unique` også før verifikation, så et ubekræftet domæne kan "reserveres" af én org (forslag: separat `pendingDomain`); (4) ingen `Certificate.pdfStorageKey`-brug — PDF genereres on demand (Vercel Blob-region ikke afklaret); (5) intet felt for kvittering af første-login-info — løst med `AuditLog(FIRST_LOGIN_INFO_SHOWN)` pr. org.
- [ ] **"Kan springes over" (placement) indgår ikke i certifikat-tjekket endnu:** `checkAndIssueCertificates` har et `skippable`-hook; M5's resultat er ikke koblet på (alle 9 Niveau 1-moduler kræves). Certifikat kræver et aktivt `TrackEnrollment` (sat af niveautest, invitation eller admin).
- [ ] **Seat-regel:** M7 genbruger M6's `decideSeat` + `getEntitlements` (`src/server/orgs/seats.ts` generaliserer kun til batches og link/domæne-joins). Email-invitationer tjekkes både i M7's batch-tjek og i M6's Better Auth-hook. Org'er uden plan (oprettet via `/virksomhed/opret`) bruger `Organization.seatLimit` (5).
- [ ] **Rapport og entitlements:** rapporten blokeres ikke af `companyReport = false` (org uden plan kan eksportere) — vandmærket "Prøveperiode" vises, medmindre abonnementet er ACTIVE/PAST_DUE. Bekræft om eksport skal kræve aktiv plan/prøve.
- [ ] **> 200 medarbejdere:** rapporten dannes i Inngest-jobbet `report.generate` og sendes som CSV + PDF-vedhæftning (SERVICE-mail `report-ready`; `sendServiceEmail` har fået valgfrie `attachments`). Ingen download-side/lagring.
- [ ] **Første-login-kvittering bruger en almindelig POST-formular** (`/api/me/data-info` → 303), fordi en server action-redirect til `/konto` genbrugte routerens cachede redirect til `/konto/data-info` (Next 16 + partial prefetching).
- [ ] **Medarbejderlisten viser "Gennemsnit af bedste forsøg"** pr. medarbejder (01 § 4.2.6 "gennemsnitsscore"). Ingen sortering efter score og ingen tid pr. trin. Rapporten viser ingen scores — kun tilbudt/bestået/certifikater.
- [ ] **Design:** alle M7-skærme er neutrale pladsholdere (`AdminShell`), designsession før M7-UI står stadig åben (roadmap).

## M8 — Månedlig cyklus, påmindelser, samtykke/marketing (13. okt 2026)
- [ ] **Hvilke NEWS hører til månedens pakke?** Cyklussen sammensættes kl. 00:30 den 1. (02 § 5), så "nye NEWS-moduler for måneden" er tolket som NEWS publiceret i den *forrige* kalendermåned (København). Bekræft.
- [ ] **Genopfriskning:** det beståede modul (på sporet, i samme org, ≤ 15 min, tilladt for licensniveauet), der er øvet længst siden (seneste gennemførte forsøg, ellers `passedAt`). Gentagelse kan aldrig sænke et bestået resultat (bedste forsøg tæller). Pakken er gennemført, når alle NEWS er bestået og genopfriskningen er gennemført igen (uanset score). Bekræft.
- [ ] **≤ 15 min:** genopfriskningen vælges først; NEWS tages i prioritet (sortOrder, nyeste først, id) så længe de kan være der. Et enkelt NEWS-modul > 15 min kommer aldrig med. Brugere uden NEWS og uden bestået modul får ingen pakke (og ingen påmindelser).
- [ ] **Copilot-niveau:** samme regel som plan-generatoren: `COPILOT_M365` og `UNKNOWN`-moduler kun til brugere med `licenseTier = COPILOT_M365`.
- [ ] **Påmindelser kun på selve dagen (1/14/25):** fejler cron en hel dag, sendes den påmindelse ikke senere. Bekræft.
- [ ] **Hard bounce stopper også SERVICE** (09 § 2) undtagen `magic-link`; tjekket springes over uden `EMAIL_HASH_PEPPER` (SERVICE må ikke fejle lukket). Bounce uden `bounce.type` behandles som hard.
- [ ] **[JURA] Helligdage/stilletid:** officielle helligdage (uden store bededag fra 2024). Juleaften, nytårsaften og grundlovsdag er ikke med — skal de?
- [ ] **[JURA] Kampagneregler** (`src/lib/marketing/campaign.ts`): førpris gældende ≥ 30 dage før start (præcis periode afklares), maks 10 dage uden annonceret slutdato, aldrig over halvdelen af normalprisperioden. Ingen kampagne/promo-kode er oprettet; `scripts/create-promo.ts` (Stripe) og `AuditLog(PROMO_CREATED)` er ikke bygget.
- [ ] **[JURA] Marketing-footer:** "Markedsføring fra Mindforward", afsender (navn, CVR, adresse fra `COMPANY_*`), hvorfor man får mailen og afmeldingslink. Marketing fejler lukket uden `COMPANY_CVR`/`COMPANY_ADDRESS`. Ordlyd skal godkendes.
- [ ] **Ét flow ad gangen:** nyhedsbrevet springes over, hvis modtageren har fået en nurture-mail inden for 14 dage. Abandoned checkout og win-back er ikke bygget i M8 (ikke i opgaven).
- [ ] **Nurture-start:** Inngest-eventet sendes fra bekræftelses-handlingen; uden `INNGEST_EVENT_KEY`/`INNGEST_DEV` startes flowet ikke (logges). Nurture-indhold er pladsholdertekst til godkendelse; nurture-4 har intet tilbud, før en valideret kampagne findes.
- [ ] **Nyhedsbrev sendes via `pnpm marketing:newsletter <draft.json> --approve`** (godkendt kladde med `approvedBy`/`approvedAt`); intet admin-UI endnu. Scriptet bruger `scripts/tsconfig.cli.json`, fordi React Email ikke kan rendere under `--conditions=react-server`.
- [ ] **Skema-huller (ingen migration lavet):** `MonthlyAssignment` har ingen reference til `Assignment`; NEWS-moduler oprettes derfor også som `Assignment(source=MONTHLY)`. `EmailMessage` mangler et felt til flow/kampagne-id (frekvens udledes af `category`/`template`). Ingen tabel til nyhedsbrevskladder/godkendelse.
- [ ] **Admin-visning:** `src/components/monthly/org-monthly-status.tsx` (autoriserer selv) er monteret på `/virksomhed/maanedspakke`; M7 kan montere den på `/virksomhed`.

## M10 — Support, observability, omkostningslofter (13. okt 2026)
- [ ] **Skema-gap: intet arkiv-flag på `Attempt`.** `reset_module_progress` (docs/08 § 2: "markerer forsøg archived") sætter forsøg til `ABANDONED` og nulstiller `Assignment` (status ASSIGNED, bestScorePct/passedAt null); certifikater røres ikke. · Forslag: `Attempt.archivedAt DateTime?` i en senere migration, så rapporter kan skelne "nulstillet" fra "opgivet". · Blokerer: intet.
- [ ] **Skema-gap: `SupportMessage` har ingen felter til model, promptVersion og tokens pr. svar** (docs/08 § 1). Model/promptVersion ligger på `SupportConversation`; tokens/kost ligger i `AiCall` (feature SUPPORT_AGENT). Guard-hits gemmes som `SupportMessage(role=TOOL, toolName="guard")`. · Forslag: `SupportMessage.model/promptVersion/inputTokens/outputTokens` hvis CSAT/kost pr. samtale skal vises. · Blokerer: intet.
- [ ] **Skema-gap: ingen `HelpArticle`-tabel** (docs/08 § 5 nævner Postgres FTS). Hjælpecenteret læser `content/help/*.md` og søger i et in-memory-indeks (MVP). · Forslag: behold filer; DB-tabel kun hvis artikler skal redigeres uden deploy. · Blokerer: intet.
- [ ] **Skema-gap: ingen CSAT (👍/👎) pr. svar** (docs/08 § 8). · Forslag: `SupportMessage.rating Int?` + kommentar. · Blokerer: metrics.
- [ ] **Deterministisk triage før modellen:** rabat/prisændring/andres data afvises af koden med fast tekst + `Escalation` (acceptkriteriet "afvist + Escalation"), uden modelkald. Det betyder også, at et høfligt "kan jeg få studierabat?" altid giver en LOW-eskalation (PRICING_OR_DISCOUNT) — evt. støj i digesten. Auto-eskalering på "medarbejder"/"ring" er indsnævret til fraser ("tale med en medarbejder", "ring til mig"), så admins der spørger om medarbejdere ikke eskaleres. · Forslag: behold; justér i `src/server/support/policy.ts` efter første måned. · Blokerer: intet.
- [ ] **Output-guard er grov** (docs/08 § 3.1-regex: fx `rabat`, `får pengene tilbage`): også en korrekt afvisning med de ord erstattes af fallback + eskalering. Svar buffres derfor, indtil guarden har kørt, og streames først bagefter. · Blokerer: intet.
- [ ] **Rigtig-model-evals (`pnpm eval:support`, CI med `ANTHROPIC_API_KEY`, 20 kr/kørsel)** er ikke bygget; de 36 scenarier kører i dag med mocket (adversarielt) model i `tests/integration/support-evals.test.ts`. · Blokerer: launch gate P12 (fuldt bevis).
- [ ] **PROMPT_TASK ved 100 %:** rubric-delen gemmes som `PENDING` med indsendt tekst (owner-only, slettes efter 30 dage); brugeren kan indsende igen, når AI kører. Et automatisk regrade-job efter loftet er løftet er ikke bygget. · Blokerer: intet.
- [ ] **Indholdsmotoren ved ≥ 95 %:** gatewayen pauser `CONTENT_DRAFT`/`CONTENT_VERIFY` (AI_DISABLED, reason DEGRADED_PAUSE) og blokerer alle features ved 100 %. M9 skal håndtere fejlen som `PipelineRunStatus.SKIPPED_BUDGET`. · Blokerer: M9-integration.
- [ ] **PostHog-klienten identificerer ikke brugeren** (ingen `identify` i browseren); forretningsevents sendes serverside med `distinct_id = user.id`. Klientens anonyme page views kobles derfor ikke til personer. · Forslag: OK for MVP (mindre data). · Blokerer: intet.
- [ ] **Offentlig kontaktformular → Escalation** (docs/08 § 1) og `/admin/support/:id`, `/admin/digest/:date` er ikke bygget (admin-UI = M7-området). Eskalationsmails linker til `/admin/support/{id}`. · Blokerer: Marcos svar-flow i appen (mail virker).

## Design (14. okt. 2026)

- [JURA] **Leverandørlogoer i app-navigationen.** Marco har valgt at vise ChatGPT-, Microsoft 365 Copilot- og Claude-logoerne ved sporene (sidemenu + Hjem). Det er i strid med CLAUDE.md's ALDRIG-regel og kan ifølge OpenAI/Microsoft/Anthropics brand-retningslinjer kræve tilladelse eller kunne opfattes som tilknytning. Billederne er hentet online uden licens. Spørgsmål til advokat: må vi bruge mærkerne nominativt ved siden af spornavnene med vores disclaimer? Hvis nej: fjern `public/brands/` og `BrandIcon` (ét sted: `src/components/shell/app-sidebar.tsx` + `src/app/(learner)/hjem/page.tsx`). Blokerer: launch.

## Certifikater: tag med og del (15. okt. 2026)
- [ ] **Sletning af virksomhedens konto sletter også certifikater udstedt dér** (`Certificate.organizationId` har `onDelete: Cascade`), også selv om medarbejderen har taget dem med til sin private konto (delingen følger certifikatet). Specifikationen siger, at certifikater "kan overføres til en personlig konto". · Forslag: når en BUSINESS-org slettes, flyttes certifikater med en `CertificateShare` til en PERSONAL-org over til den private konto (eller certifikatet ejes af brugeren, ikke org'en). · Blokerer: intet nu; skal løses før første virksomhedssletning.
- [ ] **Fortryd "tag med":** valget er endeligt i UI'et. Grundlaget er brugerens egen anmodning (ikke samtykke til markedsføring), men skal brugeren kunne trække delingen tilbage (fjerne `CertificateShare` og de medbragte beståede moduler)? · Forslag: knap under `/konto/data`, hvis advokaten mener det kræves. · Blokerer: intet.
- [ ] **[JURA] Hvad må arbejdsgiveren se?** Teksten siger, at virksomheden ser de medbragte beståede moduler og certifikater "ligesom alt andet du består her". Bekræft ordlyden og om det skal stå i DPA/privatlivspolitik. · Blokerer: launch.
- [ ] **LinkedIn-forhåndsvisning:** `/certifikat/[code]` har `robots: noindex`. LinkedIn læser Open Graph-billedet alligevel, men hvis delte links ikke viser billedet, skal vi tillade LinkedIns crawler. LinkedIn-knapperne bruger kun offentlige URL'er (`/profile/add`, `/sharing/share-offsite`) — ingen API, ingen app-godkendelse. Ordet "certification" i LinkedIns formular er LinkedIns egen sektion; vores tekst siger "AI-kompetence". · Blokerer: intet.

## Øvemiljø tæt på desktop-apps (15. okt. 2026)
- [ ] **[JURA] Trade dress:** øvemiljøet efterligner nu opbygning og arbejdsgang i ChatGPT, Claude og Microsoft 365 Copilot tæt (ikke farver, skrift, ikoner, logoer eller navne). Spørgsmål til advokat: er opbygning + generiske menubegreber + disclaimer nok til at undgå forveksling/snyltning efter markedsføringsloven og varemærkeretten? Blokerer: launch.

## Opgavevisning: CLICK_TASK i øvemiljøet (15. okt. 2026)
- [ ] **Scener findes ikke endnu** (`content/sandbox-world/scenes/` mangler). Sessionen pr. forsøg gemmer trinnets `scene` (`SandboxSession.sceneId`, `SESSION_STARTED.sceneId`), og et trin med en anden scene giver `SESSION_RESET{MODULE_START}` — men verdenen starter altid fra seed; scenens SYSTEM-events og "tilladte event-typer" (anti-snyd, 05 § 7) er ikke bygget. · Blokerer: moduler, hvis CLICK_TASK kræver en forudsat tilstand.
- [ ] **"Nyt forsøg på et CLICK_TASK" (04 § 12) er tolket som "Nulstil øvemiljø" inde i opgaven** → `SESSION_RESET{STEP_RETRY}` mærket med trinnet; evaluatoren tæller kun events efter seneste reset. Et nyt `Attempt` får altid en ny session. · Forslag: behold. · Blokerer: intet.
- [ ] **Spor for sessionen:** brugerens aktive `TrackEnrollment`, hvis modulet kører på det spor; ellers modulets første aktive spor (sortOrder). `Attempt` har intet spor. · Blokerer: intet.
- [ ] **core-prompt-01 / `ny-samtale` kan ikke løses på Copilot-sporet:** assertion kræver `UI_CLICKED nav.new-chat`, men Copilot-skinnet har ingen "Ny chat" i navigationen. · Forslag: sporspecifik assertion (`any`) eller en "Ny chat"-knap i Copilot-chatpanelet med samme target. · Blokerer: Copilot-brugere på det trin (kan springe over).
- [ ] **PROMPT_TASK "med sandkasse" og DEMO i sandkassen** (01 L4) har intet felt i modulskemaet; kun CLICK_TASK åbner øvemiljøet. "Send link til dig selv" på mobil (01 § 6) er ikke bygget — mobil viser "Fortsæt på computer" og "Spring over". · Blokerer: intet.

## Platform-design v3 (16. okt. 2026, branch `design-v3-platform`)
- [ ] **Gradienter uden for `AppIcon`:** CLAUDE.md siger "Gradienter kun i app-ikonfelter". v3 (godkendt af Marco, `mindforward-preview/platform-preview.html`) har et blåt gradient-"hero"-kort pr. skærm (`mf-hero` i tokens.css). · Forslag: opdatér designreglen i CLAUDE.md/00 § 10d til "gradienter kun i AppIcon og ét hero-kort pr. skærm". · Blokerer: intet (bygget efter godkendt mock).
- [ ] **Brandlogoer i sidebjælken:** mocken viser neutrale linjeikoner ved ChatGPT/Copilot/Claude; appen beholder `BrandIcon` (Marcos undtagelse 14. okt.) i en cirkel. · Forslag: behold, eller skift til neutrale ikoner hvis Marco foretrækker mocken 1:1. · Blokerer: intet.
- [ ] **"Tildel modulet", "Forbindelser"-gruppen (Slack, Asana …) og "Del"/⋮-knapperne** fra mocken findes ikke som funktioner i appen og er ikke bygget (ingen falske knapper/data). · Blokerer: intet; kræver egne features.

## Forløb ChatGPT, Claude og Copilot (26. okt. 2026, branch `feat/forloeb-chatgpt-claude-copilot`)
- [ ] **Forløb ved siden af de 9 kernemoduler.** De nye forløb (`/forloeb/<værktøj>`) ligger i egne tabeller (`course*`) og rører ikke `Module`/`ModuleVersion`, modullisten, niveautestens plan, månedspakken eller certifikaterne. Intet eksisterende er ændret eller skjult. · Spørgsmål: skal forløbene på sigt erstatte kernemodulerne (fx core-prompt-01), eller ligge ved siden af? · Blokerer: ingenting i dag.
- [ ] **Adgang:** forløbene kræver login og aktivt medlemskab (samme krav som /moduler og /sandkasse), men ingen betalingsgrænse ("de første 3 moduler gratis" gælder kun kernemodulerne). · Spørgsmål: skal forløbene være bag abonnement? · Blokerer: launch af forløbene.
- [ ] **Tests og certifikater i forløb:** de 12 tests er oprettet med `status = kommer-snart` og `passPercent = 80`. Platformens beståelseskrav (80 %) passer. Der er ingen testafvikling endnu, og forløbs-certifikater er ikke koblet til `Certificate` (som i dag udstedes ud fra kernemoduler pr. spor og niveau). · Blokerer: når testspørgsmålene kommer.
- [ ] **Fejl der fandtes i forvejen på `design-v3-platform` (ikke rettet):** 5 integrationstests fejler (attempts ×2, placement ×2, billing "Fortryd aftale") efter commit 7daebc4 (moduler godkendt → PUBLISHED) og prisændringen; axe `label-content-name-mismatch` på logo-linket i app-menuen (aria-label "Mindforward", tekst "Forward"). Build-fejlen på `/` (cookie læst uden for Suspense, fra 8589916) ER rettet i 9096042, ellers kunne der ikke bygges et preview.
- [ ] **Next.js 16.4.0 har en kendt sikkerhedssårbarhed** (advarsel fra `next build`). Opgradering er ikke lavet; skal besluttes særskilt.
