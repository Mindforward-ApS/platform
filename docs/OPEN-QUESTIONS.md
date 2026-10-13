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
