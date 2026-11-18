# 11 — Roadmap (M0–M10)

> Byg i rækkefølge. Én milestone = én PR. Arbejdsgang og prompt-skabeloner: `docs/00-START-HER.md`.
> Alle milestones læser: `CLAUDE.md`, `docs/00-beslutninger.md` (afsnit 10, 10a og 10b går forud; nyeste vinder), `docs/research-fund.md` ved juridiske/faktuelle spørgsmål.
> Acceptkriterier rapporteres med bevis (testnavn, kommando-output eller preview-trin). Uklart → `docs/OPEN-QUESTIONS.md`.

## Overblik

| # | Milestone | Afhænger af | Designsession med Marco |
|---|---|---|---|
| M0 | Repo, tooling, CI | — | — |
| M1 | Auth, organisationer, roller | M0 | — |
| M2 | Datamodel + seed (spor, Nordlys Logistik) | M1 | — |
| M3 | Sandkasse-motor | M2 | **FØR M3:** sandkassens visuelle identitet + skins (ChatGPT, Copilot, Claude) |
| M4 | Modulafspiller, trintyper, scoring, hints | M3 | **FØR M4:** modulafspiller, trin, hints, resultatskærm |
| M5 | Niveautest (også offentlig leadmagnet) + læringsplan | M4 | **I M5:** offentlig testside + resultatside |
| M6 | Stripe-betaling + forbrugerretlige flows | M5 | (checkout-skærme følger den valgte retning; Marco godkender på preview) |
| M7 | Admin-dashboard, invitationer, rapport, certifikater | M6 | **FØR M7-UI:** admin-dashboard + rapport/certifikat-layout |
| M8 | Månedlig cyklus, påmindelser, samtykke/marketing | M7 | — |
| M9 | Indholdsmotor | M8 | — |
| M10 | Support, hjælpecenter, observability, omkostningslofter, launch gate | M9 | — |

**Designsession:** Claude Code laver 2–4 visuelt forskellige versioner af **én skærm ad gangen** (kun tokens i `src/styles/tokens.css` + komponent-varianter), Marco vælger/kombinerer, valget skrives i `docs/00-beslutninger.md`. Funktionel kode kan bygges før, men intet design låses uden Marcos valg. Aldrig leverandørernes look, logoer eller farver.

---

## M0 — Repo, tooling, CI
**Mål:** Tomt men produktionsklart skelet, der deployer til Vercel preview med grønne checks.
**Ind:** Next.js App Router + TS strict, pnpm, ESLint, Prettier, Vitest, Playwright, Prisma mod Neon (Frankfurt), `src/lib/env.ts` (Zod-valideret env), struktureret logger, HTTP-hjælper med timeout+retry+logging, Sentry (fejl), Inngest-endpoint med test-job, `src/styles/tokens.css` (neutrale placeholders), i18n-skelet (da), GitHub Actions CI, `docs/OPEN-QUESTIONS.md`.
**Ude:** Auth, domænemodeller, design, PostHog (M10).
**Leverancer:** Repo-skelet jf. mappestruktur i `CLAUDE.md`, alle `pnpm`-scripts fra `CLAUDE.md`, `.env.example` udfyldt med navne (ingen værdier), forside med "Greb" placeholder.
**Acceptkriterier:**
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` grønne lokalt og i CI på hver PR.
- [ ] `pnpm e2e` kører en smoke-test (forsiden svarer 200) i CI.
- [ ] App starter ikke ved manglende/ugyldig env-variabel og siger hvilken (unit-test).
- [ ] HTTP-hjælperen afbryder ved timeout og retry'er kun idempotente kald (unit-tests).
- [ ] `tsconfig` har `strict: true`; ESLint fejler på `any`.
- [ ] Vercel preview-URL oprettes automatisk for PR'en; functions kører i `fra1`.
- [ ] Prisma forbinder til Neon (health-route returnerer DB-ok).
- [ ] Testfejl i Sentry modtages fra preview; Inngest test-job kører.
- [ ] Ingen farver/fonte uden for `tokens.css` (lint-regel eller grep-check i CI).
**Læs:** `docs/02-arkitektur.md`, `.env.example`.

## M1 — Auth, organisationer, roller
**Mål:** Brugere kan logge ind og tilhører en organisation med en rolle; al adgang går gennem én authz-helper.
**Ind:** Better Auth: magic link (via Resend, `SERVICE`-mail), Microsoft Entra ID, Google; organizations. `Organization` (BUSINESS|PERSONAL), `Membership` (OWNER|ADMIN|LEARNER), `Invitation` (email; accept-flow). PERSONAL-org oprettes automatisk ved B2C-signup. Authz-helper (`requireUser`, `requireMembership(orgId, roles)`), org-scoping-hjælper, `AuditLog` for rolleændringer. `EmailMessage`-log for alle udgående mails. Rate limit på login.
**Ude:** Invitation via link/domæne + admin-UI (M7), betaling (M6), endelig login-design.
**Leverancer:** Login-/signup-sider (placeholder), auth-tabeller migreret, authz-modul med tests.
**Acceptkriterier:**
- [ ] Magic link, Entra ID og Google login virker på preview (Marco tester alle tre).
- [ ] Ny B2C-bruger får automatisk PERSONAL-org med 1 seat og rollen OWNER.
- [ ] OWNER kan oprette BUSINESS-org og invitere via email; inviteret bruger lander som LEARNER.
- [ ] Unit-tests: LEARNER afvises fra admin-actions; bruger fra org A kan ikke læse/ændre org B (cross-org-test for hver ny action).
- [ ] Hver server action/route bruger authz-helperen (lint-regel eller test der scanner).
- [ ] Rolleændringer skrives i `AuditLog`.
- [ ] Ingen secrets i klient-bundle (build-check for kendte secret-navne).
**Læs:** `docs/02-arkitektur.md`, `docs/03-datamodel.md`, `docs/01-produkt.md` (signup-flow), `docs/09-email-og-marketing.md` (SERVICE-kategori).

## M2 — Datamodel + seed
**Mål:** Fuld Prisma-model og indhold i repoet, så moduler og Nordlys-verdenen kan indlæses og valideres.
**Ind:** Resten af entiteterne fra `prisma/schema.prisma` (00-beslutninger § 9). Seed: spor `CHATGPT` + `COPILOT` + `CLAUDE` aktive (`GEMINI` inaktiv), Copilot-niveauer `COPILOT_CHAT`/`COPILOT_M365` som data; `content/modules/*` indlæses som `Module`/`ModuleVersion`; Nordlys Logistik ApS fra `content/sandbox-world/` (indbakke, kalender, filer, CRM, økonomi-regneark — fiktivt). Zod-skemaer genereret/afstemt med `content/schema/module.schema.json`. `pnpm content:validate` i CI. Plan-/pris-config (B2C 49 kr inkl. moms, B2B 49 kr ex. moms/bruger, min. 5, årlig 490) seedes i DB fra config. **Fra § 10b:** entiteter og felter fra `docs/03-datamodel.md` § 15; valgfrit `takeaway` i `content/schema/module.schema.json`.
**Ude:** UI for moduler (M4), sandkasse-UI (M3).
**Leverancer:** Migrationer, `prisma/seed.ts` (idempotent), content-loader, valideringsscript.
**Acceptkriterier:**
- [ ] `pnpm db:migrate && pnpm db:seed` virker på tom Neon-branch; seed kan køres to gange uden dubletter.
- [ ] `pnpm content:validate` fejler på ugyldigt modul (test-fixture) og består på `core-prompt-01.json`.
- [ ] Zod og JSON Schema afviser samme ugyldige fixtures (paritetstest).
- [ ] `READ`-trin over 120 ord afvises af validering.
- [ ] Nordlys-data indeholder ingen rigtige persondata (PII-filteret fra M3 eller regex-test kører over `content/sandbox-world/`).
- [ ] Priser findes kun i config/DB — grep for `49` i `src/components` giver intet prisfund.
- [ ] § 10b: skemaet indeholder `WeeklyActivity`, `ReviewItem`, `UsageCheckIn`, `TeamGoal`, `OrgContextItem`, `OrgContextAcknowledgement` samt felterne `PlacementResult.kind`, `TrackEnrollment.weeklyGoalModules`, `Organization.programStartsAt`; `prisma validate` grøn.
- [ ] § 10b: `content:validate` accepterer `takeaway` og afviser hint 1–2, der gengiver `exampleSolution` (test).
**Læs:** `docs/03-datamodel.md`, `docs/05-moduler-og-scoring.md`, `content/schema/module.schema.json`, `content/curriculum.md`, `docs/04-sandkasse.md` (Nordlys-afsnit).

## M3 — Sandkasse-motor
> **Designsession før M3:** sandkassens egen visuelle identitet + layout for skins `CHATGPT` og `COPILOT`.

**Mål:** En neutral øve-app pr. spor, hvor brugeren chatter med en øvemodel og arbejder med Nordlys-data, og hvor hver handling udsender events, der kan bedømmes.
**Ind:** Sandkasse-shell + skins (kun layout-regioner + generiske menubegreber), chat via `src/server/ai/` (lille model, prompt caching, svar mærket "Øvemodel"), fiktiv indbakke/kalender/filer/CRM/regneark, simulerede "forbindelser"/"planlagte opgaver"/"egne assistenter" mod Nordlys-data. `SandboxSession` + `SandboxEvent` (typede events til `CLICK_TASK`-assertions). PII-filter klient + server (CPR, kort, kontonumre m.m.). Fast disclaimer. AI-gateway: timeout, retry, forbrugslog pr. kald, **dagligt token-loft pr. bruger**, rate limit.
**Ude:** Modulafspiller (M4), globalt månedsloft + alarm (M10), `GEMINI`-skin.
**Leverancer:** `src/server/sandbox/`, `src/server/ai/` (klient, model-config, budget, `prompts/` versioneret), sandkasse-UI med placeholder-tokens.
**Acceptkriterier:**
- [ ] Disclaimer "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google." vises altid; svar mærkes "Øvemodel".
- [ ] Ingen leverandørlogoer, -farver, -fonte, -ikoner eller skærmbilleder (review-tjekliste + asset-scan).
- [ ] Sandkassen laver ingen netværkskald ud over egen API og Anthropic (test med netværks-mock/allowlist).
- [ ] PII-filter: unit-tests for CPR (med/uden bindestreg), kortnummer (Luhn), dansk kontonummer, IBAN; blokeret input når aldrig LLM'en.
- [ ] Hver brugerhandling udsender et Zod-valideret `SandboxEvent`; assertion-matcher har unit-tests.
- [ ] Dagligt token-loft pr. bruger håndhæves (unit-test) og giver venlig besked; rate limit returnerer 429.
- [ ] Model-id kun i config; prompt-version gemmes på hvert kald.
- [ ] Skin skiftes via `Track`-data uden kodeændring (test med to spor).
**Læs:** `docs/04-sandkasse.md`, `docs/02-arkitektur.md` (AI-gateway), `docs/10-compliance.md` (varemærker, PII).

## M4 — Modulafspiller, trintyper, scoring, hints
> **Designsession før M4:** modulafspiller, trin-layout, hint-panel, resultatskærm.

**Mål:** Brugeren kan gennemføre et modul med alle trintyper og få en fair, forklaret score.
**Ind:** Afspiller for `READ`, `DEMO`, `CLICK_TASK`, `PROMPT_TASK`, `QUIZ`, `SPOT_ERROR`, `JUDGMENT`. 3-trins hint (trin 3 = 0 point for trinnet). Scoring: bestået ≥ 80 %, ubegrænsede forsøg, bedste forsøg tæller, datasikkerheds-`JUDGMENT` er must-pass. `PROMPT_TASK`: deterministiske checks → LLM-rubric (struktureret output, temperatur 0); rubric-kriterier vises efter forsøg; rubric-version + model-id gemmes på `StepResult`. `Attempt`, `StepResult`, `Assignment`. Inngest-job: slet prompt-tekster efter 30 dage. **Fra § 10b:** resultatskærm viser modulets `takeaway` ved bestået ("Brug det i dit eget job") + "Mine skabeloner"; coach-princip for hints/feedback (docs/05 § 10).
**Ude:** Certifikat-PDF (M7), niveautest (M5), betalingsspærre (M6).
**Leverancer:** `src/server/scoring/`, `src/server/modules/`, afspiller-UI, e2e "gennemfør modul".
**Acceptkriterier:**
- [ ] Unit-tests (skrevet først): 80 %-grænse (79,9 % dumper), bedste forsøg tæller, must-pass-`JUDGMENT` dumper modulet trods ≥ 80 %, hint trin 3 giver 0 point, hint trin 1–2 jf. `docs/05-moduler-og-scoring.md`.
- [ ] `PROMPT_TASK`: deterministiske checks afviser uden LLM-kald; rubric-svar Zod-valideres; ugyldigt LLM-output giver kontrolleret fejl, ikke 0 point (tests med mocket LLM).
- [ ] `StepResult` gemmer rubric-version + model-id.
- [ ] `CLICK_TASK` bestås kun når matchende `SandboxEvent` findes.
- [ ] Playwright: bruger gennemfører `core-prompt-01` og ser bestået-skærm med kriterier.
- [ ] Retention-job sletter prompt-tekst ældre end 30 dage og bevarer score (test).
- [ ] Ingen API-route returnerer prompt-tekst til andre end ejeren (test).
- [ ] § 10b: bestået modul med `takeaway` viser skabelonen med kopiér-knap; ikke-bestået viser den ikke (e2e). "Mine skabeloner" viser kun skabeloner fra egne beståede moduler (test).
- [ ] § 10b: hint 1–2 og grader-feedback indeholder ikke `exampleSolution` (test på eksempelmodulet + golden set).
**Læs:** `docs/05-moduler-og-scoring.md`, `content/schema/module.schema.json`, `content/modules/core-prompt-01.json`, `docs/04-sandkasse.md`.

## M5 — Niveautest + læringsplan (inkl. offentlig leadmagnet)
> **Designsession i M5:** offentlig testside + resultatside (første skærme ude af huset).

**Mål:** 5-min niveautest giver en personlig modulplan — både for brugere og som offentlig gratis "AI-niveautest".
**Ind:** Flow landingsside → vælg værktøj → (opret bruger) → niveautest → plan. `PlacementResult` → `Assignment`s (inkl. `ROLE`-moduler efter valgt rolle; Copilot-niveau spørges). Offentlig version uden login: resultatside + **ikke-forudafkrydset** marketing-samtykke-checkbox (frivillig, specifik) → `ConsentRecord` (tidspunkt, kilde, tekstversion, IP/user-agent) + dobbelt opt-in-mail. Konvertering offentlig test → konto bevarer resultatet. **Fra § 10b:** sluttjek (`PlacementResult.kind = EXIT`, parallel spørgsmålsbank) med før/efter pr. område; anbefalet tempo i plan-generatoren (kan ændres/slås fra — intet fast forløb); kontekstvalg efter login for brugere med både privat og erhverv; salgssiden `/virksomheder` i rækkefølgen fra docs/01 P2.
**Ude:** Marketingudsendelser (M8), betaling (M6), analytics (M10).
**Leverancer:** Testmotor, plan-generator (ren funktion), offentlig side, samtykke-modul under `src/server/email/` (præcis placering jf. `docs/02-arkitektur.md`).
**Acceptkriterier:**
- [ ] Unit-tests for plan-generator: givet svar → forventede moduler/rækkefølge; Copilot-niveau filtrerer moduler korrekt.
- [ ] Testen kan gennemføres på ≤ 5 min (antal/tidsbudget i config; Marco tester på mobil).
- [ ] Resultat vises uden at give samtykke; checkbox er ikke forudafkrydset (e2e-assert).
- [ ] `ConsentRecord` gemmer alle påkrævede felter; samtykke aktiveres først ved klik i opt-in-mail (test).
- [ ] Kun-test-leads uden aktivt samtykke kan ikke modtage `MARKETING` (gate-test).
- [ ] Offentligt endpoint har rate limit + bot-beskyttelse.
- [ ] § 10b: unit-tests for anbefalet tempo (givet niveau + minutter → moduler/uge og forventet slutdato; `null` slår det fra).
- [ ] § 10b: sluttjek bruger andre spørgsmål end brugerens niveautest, laver ingen LLM-kald og ændrer hverken modulscore eller certifikat (test).
- [ ] § 10b: `/virksomheder` indeholder ingen bødetrusler, intet "10 %"-tal og ingen kunderesultater, der ikke findes som data (tekstgennemgang + `banned-claims`).
**Læs:** `docs/01-produkt.md`, `docs/05-moduler-og-scoring.md`, `docs/09-email-og-marketing.md`, `docs/10-compliance.md`.

## M6 — Stripe-betaling + forbrugerretlige flows
**Mål:** B2C og B2B kan betale, prøve, fortryde og opsige lovligt; Stripe-webhooks er eneste sandhed.
**Ind:** Planer fra config/DB: B2C 49 kr/md inkl. moms (årlig 490), B2B 49 kr/bruger/md ex. moms (årlig 490), min. 5 brugere, én betaling pr. virksomhed (subscription quantity). B2B-prøve 14 dage uden kort, op til 5 brugere. B2C gratis: niveautest + første 3 moduler. Entitlement-tjek serverside. Stripe Checkout (kort), Customer Portal (dansk), webhooks → `Subscription`. Moms uden Stripe Tax jf. `docs/07-betaling.md`. **B2C-checkout:** pris pr. md. inkl. moms med fed lige over knappen, knap **"Køb"**, eksplicit samtykke + erkendelse ved straks-adgang, kvittering på mail (varigt medium). **"Fortryd aftale"**-knap synlig i 14 dage → formular (navn, aftale, email) → **"Bekræft fortrydelse"** → kvittering med dato/tid. **Opsigelse i appen** lige så let som tilmelding. Prøveperiode viser pris efter prøven, frekvens og automatisk fornyelse.
**Ude:** EAN/e-conomic (fase 2), MobilePay, Stripe Tax, rabatkoder.
**Leverancer:** `src/server/billing/`, webhook-route, checkout/fortryd/opsig-skærme (placeholder-design), plan-config (placering jf. `docs/07-betaling.md`).
**Acceptkriterier:**
- [ ] Unit-tests: entitlements (gratis 3 moduler, B2B min. 5 seats, prøve maks. 5 brugere/14 dage, udløbet abonnement), prisberegning inkl./ex. moms fra config.
- [ ] Webhook afviser ugyldig signatur (test) og er idempotent ved gentagne events (test).
- [ ] Abonnementsstatus i UI kommer kun fra `Subscription` opdateret af webhooks.
- [ ] Playwright (Stripe testmode): B2C-køb → straks-adgang → "Fortryd aftale" → "Bekræft fortrydelse" → kvitteringsmail logget med dato/tid.
- [ ] Playwright: opsigelse i appen på ≤ samme antal trin som tilmelding.
- [ ] Køb-knap hedder "Køb"; pris inkl. moms står med fed lige over (e2e-assert); samtykke-checkbox ikke forudafkrydset.
- [ ] "Fortryd aftale" er synlig i hele 14-dages-perioden og skjult derefter (test med fake clock).
- [ ] Ændring af pris i config/DB slår igennem uden kodeændring.
- [ ] Afklaring "digitalt indhold vs. tjenesteydelse" + refusionsregel ved fortrydelse står i `docs/OPEN-QUESTIONS.md` til advokat, hvis ikke afgjort.
**Læs:** `docs/07-betaling.md`, `docs/10-compliance.md`, `docs/research-fund.md` (forbrugeraftaleloven).

## M7 — Admin-dashboard, invitationer, rapport, certifikater
> **Designsession før M7-UI:** dashboard, medarbejderliste, rapport- og certifikat-layout.

**Mål:** En virksomheds-admin kan invitere, følge fremskridt og dokumentere medarbejdernes AI-kompetencer.
**Ind:** Dashboard: status, score og certifikater pr. medarbejder/spor/rolle — **aldrig prompt-tekster**. Invitation via email, link og verificeret domæne; seat-loft mod `Subscription.quantity`. Tildeling af spor/`ROLE`-moduler. Certifikat-PDF pr. bestået spor-niveau (`Certificate`, verificerbar). Virksomhedsrapport (CSV + PDF) som "dokumenteret, rollebaseret tiltag efter art. 4" — uden certificerings-/lovkravs-sprog. `AuditLog` for admin-handlinger. **Fra § 10b:** kontekstbibliotek (`/virksomhed/kontekst`, `/hos-os`, bekræftelser, visning ved `core-policy-01`/`core-data-01`), teammål + valgfri fælles startdato, AI-tjek af teamet (PDF), lederkit, udvidet rapport (grundmodul, før/efter, politik-version, næste genopfriskning, DS/PAS 2500-4-oversigt).
**Ude:** Månedscyklus (M8), indholdsgodkendelse (M9).
**Leverancer:** Admin-routes + actions, PDF-generator, CSV-eksport.
**Acceptkriterier:**
- [ ] Ingen admin-query/-endpoint/-eksport indeholder prompt-tekst (test der scanner svar-skemaer + e2e).
- [ ] Admin i org A kan ikke se/eksportere data fra org B (test).
- [ ] Invitation over seat-loftet afvises med forklaring (test); domæne-join kræver verificeret domæne.
- [ ] Playwright: admin inviterer medarbejder → medarbejder accepterer → vises på dashboard.
- [ ] Certifikat-PDF genereres ved bestået spor-niveau og kan verificeres via unik URL/ID.
- [ ] Rapport (CSV + PDF) indeholder ikke ordene "certificering", "lovkrav", "påkrævet niveau" eller bøder (test på genereret tekst).
- [ ] Scores præsenteres som læring (tekster godkendt af Marco på preview).
- [ ] § 10b: kun OWNER/ADMIN kan oprette/ændre `OrgContextItem`; org A kan ikke læse org B's kontekst (test); ændringer skrives i `AuditLog`.
- [ ] § 10b: intet LLM-kald indeholder indhold fra kontekstbiblioteket (test på `src/server/ai/`-grænsen); PII-filteret blokerer CPR m.m. ved gem (test).
- [ ] § 10b: ny version af AI-politik/dataregler kræver ny bekræftelse; rapporten viser version + dato pr. medarbejder (test).
- [ ] § 10b: teammål viser samlet fremdrift uden navne; PERSONAL-organisationer har hverken teammål, startdato eller kontekstbibliotek (test).
- [ ] § 10b: fælles startdato — niveautest kan tages før datoen, moduler åbner på datoen (test med fake clock).
- [ ] § 10b: rapportens DS/PAS 2500-4-afsnit er slået fra bag feature-flag, indtil ordlyden er verificeret (`docs/OPEN-QUESTIONS.md`).
**Læs:** `docs/01-produkt.md`, `docs/03-datamodel.md`, `docs/10-compliance.md` (AI-forordningen, GDPR, databehandler).

## M8 — Månedlig cyklus, påmindelser, samtykke/marketing
**Mål:** Brugerne får automatisk en kort månedspakke og påmindelser; marketing kan kun nå folk med gyldigt samtykke.
**Ind:** `MonthlyCycle` pr. kalendermåned: nye `NEWS`-moduler for brugerens spor + 1 genopfriskning, mål ≤ 15 min (`MonthlyAssignment`). Påmindelser (`SERVICE`) dag 1, 14 og 25 hvis ikke gennemført; brugeren kan slå dem fra; **aldrig tilbud**. Marketing-motor: `MARKETING` kun via samtykke-gate, afmeld-link i hver mail, afsender + markedsføring tydeligt, rabatter reelle (maks. 10 dage eller annonceret slutdato, reel førpris, ingen nulstillende nedtællere). Resend-webhooks (bounce, complaint, unsubscribe) → `ConsentRecord`/`EmailMessage`. **Fra § 10b:** ugentlig streak (`WeeklyActivity`), genopfriskningsspørgsmål efter ca. 1 og 3 uger (`ReviewItem`, i appen og i månedspakken — ingen nye mails), ugentligt tjek-ind (`UsageCheckIn`), genopfriskning ved skift af jobrolle/spor og årstjek, samlede teamtal til admin.
**Ude:** Annonceautomatik (kun hvis `docs/09-email-og-marketing.md` kræver den i MVP — så med hårdt loft 20.000 kr/md i kode).
**Leverancer:** Inngest-cron for cyklus + påmindelser, email-skabeloner pr. kategori, samtykke-gate.
**Acceptkriterier:**
- [ ] Unit-tests: samtykke-gate blokerer `MARKETING` uden aktivt, bekræftet `ConsentRecord`; tilbagekaldt samtykke blokerer straks.
- [ ] Unit-test: `SERVICE`-skabeloner afvises hvis de indeholder tilbuds-/rabatfelter (skabelon-skema).
- [ ] Cyklus-sammensætning er deterministisk og ≤ 15 min estimeret (test).
- [ ] Påmindelser sendes kun dag 1/14/25 til ikke-gennemførte og ikke til fravalgte (test med fake clock).
- [ ] Afmeld-link virker uden login og registreres (e2e).
- [ ] Resend-webhook verificerer signatur (test).
- [ ] Admin ser cyklus-status pr. medarbejder (ikke prompt-tekster).
- [ ] § 10b: unit-tests for streak (aktiv uge, pause efter én tom uge, nulstil efter to, uge-grænse i København-tid) — skrevet først.
- [ ] § 10b: bestået modul opretter `ReviewItem`s med forfald dag 7 og 21; svar ændrer ikke modulscore (test med fake clock).
- [ ] § 10b: admin-endpoints returnerer tjek-ind/streak kun som samlede tal og kun ved ≥ 5 personer; ellers "for få svar" (test); aldrig pr. person.
- [ ] § 10b: skift af `Membership.jobRole` tildeler det nye rollemodul; årstjek tildeles 12 måneder efter grundmodulet (test med fake clock).
- [ ] § 10b: ingen streak-/tjek-ind-tekst indeholder tilbud, nedtællere eller skyld-formuleringer (skabelon-/i18n-tjek).
**Læs:** `docs/09-email-og-marketing.md`, `docs/10-compliance.md`, `docs/05-moduler-og-scoring.md` (NEWS).

## M9 — Indholdsmotor
**Mål:** Officielle release notes bliver automatisk til verificerede `NEWS`-moduler; alt andet venter på 1-klik-godkendelse.
**Ind:** `ContentSource` seedet med kilderne fra `docs/research-fund.md`. Dagligt Inngest-cron: `fetch` (ærlig User-Agent, ETag/If-Modified-Since, retries) → `snapshot` → `diff` → `classify` (erhvervsrelevant? EU/DK? abonnement?) → `draft` (JSON-modul, kilde pr. påstand, egne ord) → `verify` (schema + uafhængig verifikator-model pr. påstand) → publiceringspolitik. `NEWS` (kun `READ`+`QUIZ`) auto-publiceres med "Automatisk opdateret [dato] — kilde: [link]". Ny sandkasse-UI eller `CORE`-ændring → GitHub-issue med kladde + `IN_REVIEW` → 1-klik-godkendelse i admin. Kill switch, rollback til forrige `ModuleVersion`, `PipelineRun`-log. Ukendt region → "tjek tilgængelighed hos jer". Microsoft Learn krediteres (CC BY 4.0).
**Ude:** Nye sandkasse-features (bygges manuelt via issues).
**Leverancer:** `src/server/content-engine/`, versionerede prompts, owner-review-skærm.
**Acceptkriterier:**
- [ ] Pipeline kører end-to-end mod gemte fixtures (ingen live-kald i tests) og producerer et gyldigt `NEWS`-modul.
- [ ] Verifikation fejler → intet publiceres; kørsel logget med årsag (test).
- [ ] `CORE`/UI-krævende kladde publiceres aldrig automatisk (test) og opretter GitHub-issue (mocket).
- [ ] Kill switch stopper næste kørsel; rollback gendanner forrige version (tests).
- [ ] Uændret kilde (304/samme hash) giver ingen ny kladde (test).
- [ ] Hver påstand i et modul har kildelink; manglende kilde → afvist (test).
- [ ] Marco kan godkende/afvise et `IN_REVIEW`-modul med ét klik på preview.
**Læs:** `docs/06-indholdsmotor.md`, `docs/05-moduler-og-scoring.md`, `docs/research-fund.md` (opdateringskilder).

## M10 — Support, hjælpecenter, observability, omkostningslofter, launch gate
**Mål:** Produktet kan drives af Marco på ≤ 2 timer/uge og er klar til launch.
**Ind:** In-app supportagent (tool use): slå konto/plan op, send Customer Portal-link, gensend faktura-link, nulstil modulfremskridt, svar fra hjælpecenter. **Må aldrig:** refundere, ændre priser, give rabatter, love noget juridisk, udlevere data om andre brugere → `Escalation` + daglig digest til ejer. Hjælpecenter-artikler. PostHog EU (med cookie-samtykke jf. `docs/10-compliance.md`), Sentry-alarmer, health checks. Omkostningslofter: globalt månedligt AI-loft med alarm ved 80 %, verificér dagligt loft pr. bruger, marketingloft 20.000 kr/md (hvis annonceautomatik findes). Forbrugsoversigt i owner-admin.
**Ude:** Nyt spor (`GEMINI`), EAN, "Grundforløb"-pakke (fase 2).
**Leverancer:** `src/server/support/`, hjælpecenter, budget-alarmer, daglig digest, launch-tjekliste udfyldt.
**Acceptkriterier:**
- [ ] Unit-tests: agentens værktøjer er org-scopede; forsøg på refusion/rabat/prisændring/andres data → afvist + `Escalation` (evals med mocket LLM og adversarielle prompts).
- [ ] Daglig digest sendes til ejer med eskalationer, pipeline-kørsler, fejl og AI-forbrug.
- [ ] Unit-tests: globalt loft blokerer nye AI-kald pænt; alarm ved 80 % udløses præcis én gang pr. måned.
- [ ] PostHog sætter ingen analyse-cookies før samtykke (e2e).
- [ ] Sentry-alarm ved fejlrate-spike; uptime-check på kritiske routes.
- [ ] Alle Playwright-flows grønne: signup, checkout inkl. "Fortryd aftale", gennemfør modul, invitér, opsig.
- [ ] Launch gate (nedenfor) er 100 % afkrydset.
**Læs:** `docs/08-support.md`, `docs/10-compliance.md`, `docs/02-arkitektur.md` (observability).

---

## Launch gate
Ingen produktion med rigtige kunder og ingen live-betalinger før alt er afkrydset. Fuld tjekliste og juridiske detaljer: **`docs/10-compliance.md`** (den er autoritativ; denne liste er minimum).
- [ ] Advokatgennemgang: handelsbetingelser, "digitalt indhold vs. tjenesteydelse", fortrydelsesflow, varemærker/GUI-skins og disclaimer.
- [ ] Databehandleraftale-skabelon til B2B-kunder (Datatilsynets skabelon), privatlivspolitik, cookiepolitik offentliggjort.
- [ ] Underdatabehandlere (Anthropic, Vercel, Neon, Resend, Stripe, Inngest, PostHog, Sentry) listet med region.
- [ ] Prompt-retention (30 dage) og PII-filter verificeret i produktion.
- [ ] Ingen "AI Act-certificering"/"lovkrav"/bødetrusler i UI, mails, landingsside og rapporter (tekstgennemgang).
- [ ] Navnet "Greb": domæne og varemærke tjekket.
- [ ] Stripe live-mode, kvitteringer, Customer Portal og "Fortryd aftale" testet med rigtigt kort og refunderet.
- [ ] Bogføring: e-conomic + Stripe-integration (Pairy/Integrationspartner) kører.
- [ ] AI-forbrugsgrænser sat både i app-config og i Anthropic-konsollen; marketingloft 20.000 kr/md.
- [ ] Neon backup/restore testet; Sentry + digest modtages.
- [ ] Marco har godkendt endeligt design for alle offentlige skærme.
