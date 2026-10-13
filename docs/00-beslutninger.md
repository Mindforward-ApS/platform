# Greb — Beslutningslog (kanonisk)

> Denne fil er sandheden. Alle andre filer i pakken skal være konsistente med den.
> Ændres en beslutning, ændres den HER først.

Arbejdstitel: **Greb** — "Få greb om AI". (Domæne ikke tjekket.) Kodenavn/repo: `greb`.
Ejer: Marco (solo-founder). Selskab: under Esther Gruppen ApS.

## 1. Produkt
- Webapp hvor medarbejdere lærer AI ved at **gøre ting** i en sandkasse — ingen webinarer, ingen lange videoer.
- Flow: landingsside → vælg værktøj (spor) → opret bruger → 5-min niveautest → personlig modulplan → sandkasse.
- **Spor (Track):** `CHATGPT`, `COPILOT` (Microsoft 365 Copilot), `CLAUDE`, `GEMINI`. MVP: `CHATGPT` + `COPILOT` + `CLAUDE`. `GEMINI` i fase 2. Spor er data, ikke kode.
- **Sandkasse:** neutral, egen UI. Hvert spor har en "skin" = layout-mønster + menunavne/terminologi som i værktøjet, men ALDRIG logoer, varemærkefarver, fonte, ikoner eller produktnavne på vores egen UI-chrome. Fast disclaimer: "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google." Produktnavne bruges kun beskrivende ("Lær Microsoft 365 Copilot").
- Chatsvar i sandkassen kommer fra en rigtig model via Anthropic API, mærket "Øvemodel". Vi påstår aldrig, at det er ChatGPT/Copilot der svarer.
- **Fiktiv øvevirksomhed:** "Nordlys Logistik ApS" (40 ansatte, Aarhus) med fiktiv indbakke, kalender, filer, kunde-CRM og økonomi-regneark. Connectors og automationer øves mod disse data — aldrig mod brugerens rigtige data.
- Sandkassen må ikke modtage rigtige persondata: klient- og serverside-filter advarer/blokerer CPR-numre, kortnumre, kontonumre m.m.

## 2. Modulsystem
- Modul = JSON (valideret med Zod + JSON Schema), versioneret (`ModuleVersion`).
- Modultyper: `CORE` (fast pensum), `FEATURE` (ét værktøjs-feature), `NEWS` (auto-genereret nyhed), `ROLE` (rollespecifikt: salg, HR, økonomi, kundeservice, ledelse, drift).
- Trintyper (`StepType`):
  - `READ` — maks 120 ord.
  - `DEMO` — animeret gennemgang i sandkassen.
  - `CLICK_TASK` — brugeren udfører en handling i sandkassen; bestået = sandkasse-event matcher assertion.
  - `PROMPT_TASK` — brugeren skriver en prompt; bedømmes af rubric.
  - `QUIZ` — multiple choice.
  - `SPOT_ERROR` — find fejlen/hallucinationen i et AI-svar.
  - `JUDGMENT` — scenarie: "Må du gøre dette?" (datasikkerhed, GDPR, fortrolighed).
- Hjælp: 3-trins hint (nudge → konkret → vis løsning). Trin 3 giver 0 point for trinnet.
- Scoring: hvert trin har point; modul bestået ved ≥ 80 %; ubegrænsede forsøg; bedste forsøg tæller. `JUDGMENT`-trin om datasikkerhed er must-pass.
- `PROMPT_TASK`-bedømmelse: først deterministiske checks (længde, påkrævede elementer, forbudt indhold), derefter LLM-rubric (struktureret output, temperatur 0). Rubric-kriterier vises for brugeren efter forsøg. Rubric-version + model-id gemmes på hvert resultat.
- Certifikat: PDF pr. bestået spor-niveau. Virksomhedsrapport (CSV + PDF) til dokumentation af medarbejdernes AI-kompetencer.

## 3. Månedlig træning
- `MonthlyCycle` pr. kalendermåned: auto-sammensat pakke (nye `NEWS`-moduler for brugerens spor + 1 genopfriskning). Mål ≤ 15 min.
- Påmindelser er SERVICE-mails: dag 1, dag 14 og dag 25 hvis ikke gennemført. Admin ser status. Brugeren kan slå påmindelser fra.

## 4. Indholdsmotor (auto-opdatering)
- Kilder: officielle release notes/changelogs pr. spor (`ContentSource`). Dagligt cron-job.
- Pipeline: `fetch` → `snapshot` → `diff` → `classify` (relevant for erhvervsbrugere? tilgængelig i EU/Danmark? hvilke abonnementer?) → `draft` (JSON-modul, kildehenvisning pr. påstand) → `verify` (schema + uafhængig verifikator-model sammenholder hver påstand med kildeteksten) → publiceringspolitik.
- Publiceringspolitik:
  - `NEWS`-moduler (kun `READ` + `QUIZ`, ingen ny sandkasse-UI) auto-publiceres når verifikation passerer. Mærkes "Automatisk opdateret [dato] — kilde: [link]".
  - Moduler der kræver ny sandkasse-UI eller ændrer `CORE`: opretter GitHub-issue med kladde til Claude Code og ligger i `IN_REVIEW`; publiceres først efter 1-klik-godkendelse i admin.
- Kill switch, rollback til forrige `ModuleVersion`, alle kørsler logges (`PipelineRun`).

## 5. Kunder og betaling
- B2B: `Organization(type=BUSINESS)` med seats. Roller: `OWNER`, `ADMIN`, `LEARNER`. Admin inviterer via email, link eller verificeret domæne. SSO: Microsoft Entra ID og Google.
- B2C: `Organization(type=PERSONAL)` med 1 seat — samme datamodel.
- Stripe: Checkout, Billing (subscriptions, per-seat quantity), Customer Portal, Stripe Tax, webhooks er eneste sandhed for abonnementsstatus. Planer/priser i config + DB, aldrig hardkodet i komponenter.
- Forbrugere: fortrydelsesret håndteres ved checkout (eksplicit samtykke + erkendelse når adgang starter straks). Opsigelse skal kunne ske online lige så nemt som tilmelding.
- Priser er hypoteser indtil testet.

## 6. Support
- In-app supportagent (Anthropic API, tool use) med værktøjer: slå konto/plan op, send link til Stripe-kundeportal, gensend faktura-link, nulstil modulfremskridt, svar fra hjælpecenter-artikler.
- Må ALDRIG: refundere, ændre priser, give rabatter, love noget juridisk, udlevere data om andre brugere. Eskalerer til support-indbakke (`Escalation`). Daglig digest til ejer.

## 7. Email og marketing
- To kategorier: `SERVICE` (login, kvittering, træningspåmindelser, sikkerhed) og `MARKETING` (tilbud, nyhedsbrev, rabatter).
- `MARKETING` kræver registreret samtykke (`ConsentRecord`: tidspunkt, kilde, tekstversion, IP/user-agent) + dobbelt opt-in. Afmeld-link i hver marketingmail.
- Ingen kolde marketingmails — heller ikke B2B (dansk markedsføringslov).
- Rabatter skal være reelle og tidsbegrænsede. Ingen falsk "kun i dag".
- Leadmagnet: gratis "AI-niveautest" (5 min) → resultatside → ikke-forudafkrydset samtykke-checkbox til marketing.

## 8. Stack (verificér versioner ved opstart)
Next.js (App Router) + TypeScript strict · Prisma · Neon Postgres (AWS Frankfurt) · Vercel (function region `fra1`) · Anthropic API · Better Auth (magic link, Microsoft Entra ID, Google, organizations) · Stripe · Resend · Inngest (baggrundsjobs + cron) · PostHog (EU Cloud) · Sentry · Zod · Tailwind + shadcn/ui-primitiver · Vitest + Playwright · pnpm.
- **Design er IKKE besluttet.** Byg med neutrale placeholder-tokens i én fil (`src/styles/tokens.css`). Endeligt design laves skærm for skærm sammen med Marco, med flere visuelle versioner at vælge imellem. Lås ikke standard-layouts fast.
- Sprog: UI på dansk (i18n-klar, engelsk senere). Kode, identifiers, commits og kommentarer: engelsk.

## 9. Kanoniske entiteter (Prisma ejer navnene)
`User`, `Session`, `Account`, `Verification` (auth), `Organization` (type: BUSINESS|PERSONAL), `Membership` (role: OWNER|ADMIN|LEARNER), `Invitation`, `Subscription` (spejler Stripe), `Track`, `Module`, `ModuleVersion` (status: DRAFT|IN_REVIEW|PUBLISHED|ARCHIVED; origin: MANUAL|AUTO; indeholder trin som JSON — trin er ikke egen tabel), `Assignment`, `Attempt`, `StepResult`, `Certificate`, `MonthlyCycle`, `MonthlyAssignment`, `PlacementResult`, `ContentSource`, `SourceSnapshot`, `ChangeEvent`, `PipelineRun`, `ConsentRecord`, `EmailMessage`, `SupportConversation`, `SupportMessage`, `Escalation`, `AuditLog`, `SandboxSession`, `SandboxEvent`. Den fiktive virksomhed (Nordlys Logistik) er seed-data i repoet (`content/sandbox-world/`), ikke brugerdata.

## 10. Rettelser efter research (12. okt 2026) — gælder forud for ovenstående
Se `docs/research-fund.md` for kilder.
- **Pensum er begrebsbaseret:** "egne assistenter", "forbindelser til systemer", "planlagte opgaver", "agenter". Værktøjernes funktionsnavne (Plugins, Skills, Agent Builder, Gems …) er data fra indholdsmotoren — de skifter hurtigt (fx udfases Custom GPTs 11. dec 2026).
- **Claude er med i MVP** (besluttet af Marco 13. okt 2026): tre spor ved launch — ChatGPT, Copilot og Claude. Gemini i fase 2.
- **Copilot-sporet har to niveauer:** `COPILOT_CHAT` (gratis med Microsoft 365) og `COPILOT_M365` (betalt licens). Modulerne angiver hvilket niveau de kræver.
- **Sandkassen har egen visuel identitet.** Skins må kun spejle layout-regioner og generiske menubegreber. Ingen skærmbilleder af leverandørernes UI inde i produktet.
- **Admins ser status, score og certifikater — ikke medarbejdernes prompt-tekster.** Prompt-tekster slettes efter 30 dage. Scores markedsføres som læring, ikke overvågning.
- **Betaling:** kort via Stripe (MobilePay kan ikke køre abonnementer via Stripe). B2C-checkout skal have: pris pr. md. inkl. moms med fed over knappen, knap "Køb", samtykke + erkendelse ved straks-adgang, kvittering på mail, **"Fortryd aftale"-knap** i 14 dage (forbrugeraftaleloven § 20 a), opsigelse i appen.
- **Offentlige kunder (EAN):** fase 2 via e-conomic API. Bogføring: e-conomic + Pairy/Integrationspartner til Stripe-posteringer.
- **Priser (besluttet af Marco 12. okt 2026):** B2C 49 kr/md inkl. moms (årlig 490 kr). B2B 49 kr/bruger/md ex. moms (årlig 490 kr/bruger), min. 5 brugere, én samlet betaling pr. virksomhed. Priser ligger i config/DB, så de kan ændres uden kode (Claudes anbefaling om 99 kr for B2B kan testes senere). B2B-prøveperiode: 14 dage uden kort, op til 5 brugere. B2C: niveautest + første 3 moduler gratis. Senere: "Grundforløb" som fast pakke (6 timer + certifikat) til kompetencefondenes positivlister.
- **Budgetlofter:** marketing maks. 20.000 kr/md (hårdt loft i annonce-automatikken). AI-forbrug: én lille model som standard, prompt caching, dagligt token-loft pr. bruger, samlet månedligt loft med alarm ved 80 % — mål ca. 5.000–10.000 kr/md ved 10.000 brugere. Stripe Tax bruges ikke i MVP (dansk moms beregnes selv; EU-salg håndteres når nødvendigt).
- **Marketing:** samtykke kræves også over for virksomheder. Ingen mails til folk, der kun har taget testen, uden aktivt samtykke. Rabatter maks. 10 dage eller med annonceret slutdato, reel førpris, ingen nulstillende nedtællere. Træningspåmindelser indeholder aldrig tilbud.
- **AI-forordningen:** budskabet er "dokumenteret, rollebaseret tiltag efter art. 4". Aldrig "certificeringskrav", "påkrævet niveau" eller bødetrusler. Virksomhedsrapporten er en selvstændig feature.

- **B2C-opsigelse (besluttet af Marco 13. okt 2026):** ingen binding og intet opsigelsesvarsel. Kunden kan opsige fra dag til dag i appen og beholder adgang resten af den løbende måned, der er betalt for. Ingen refusion for den påbegyndte måned (fortrydelsesretten i de første 14 dage er uændret). B2C-årsplan: åben — se `docs/OPEN-QUESTIONS.md`.

## 10a. Rettelser efter kickoff-gennemgang (13. okt 2026) — godkendt af Marco ("alt problematisk går vi uden om")
Gælder forud for resten af pakken, inkl. § 10. Detaljer i `docs/OPEN-QUESTIONS.md`.
- **Ingen B2C-årsplan i MVP.** B2C kun 49 kr/md. B2B-årsplan bevares.
- **Kun OWNER** må købe, ændre seats, opsige og fortryde (B2B). ADMIN inviterer og ser status.
- **Seat** = aktiv `Membership` (alle roller) + åben `Invitation`. Min. 5 og prøve-loft på 5 tælles sådan.
- **Certifikatets offentlige side er opt-in** (`publicVerificationEnabled` default `false`).
- **Opbevaring:** `docs/10-compliance.md` vinder over 03 (anonym niveautest 90 dage; B2B-org 90 dage read-only + varsel 14 dage før sletning). `AuditLog` 2 år, bevis-handlinger (fortrydelse, DPA, samtykke) 5 år.
- **Annonceautomatik er fase 2.** Ingen kode mod Google/Meta Ads i MVP; marketingloftet på 20.000 kr gælder først, når den bygges.
- **Ingen brug af MFL § 10 stk. 2** (eksisterende kunder) — al marketing kræver samtykke.
- **Grading har eget dagligt loft** (`AI_USER_DAILY_GRADING_CAP`), adskilt fra chat.
- **Moduler kan ligge på flere spor** (join-tabel `ModuleTrack`, M2).
- **Target-id'er:** kebab-case med punktum, fx `nav.new-chat`, `mail.m08`, `file.f13` (M3).
- **Plan-krav:** kun Copilot-niveau (`requiresTier`) i MVP; intet plan-mærkat for ChatGPT/Claude.
- **Eksempelmoduler bruger kun eksisterende Nordlys-data** og relative datoer (rettes i M2).
- **Launch-gate-features får milestones:** 2FA for GREB_ADMIN → M1; juridiske sider + cookiebanner → M5; seat-loft på invitationer → M6; DPA-accept, info ved første login, GDPR-eksport/-sletning → M7.
- **Roadmap-afhængigheder:** M2 bruger regex-test i stedet for PII-filteret; M6 sender eskalationer som simpel mail til `SUPPORT_INBOX`; M8 tester med fixture-NEWS-moduler.
- **Kunde-admins data-side** hedder `/virksomhed/data` (`/admin` er Grebs interne drift).
- **Stack-versioner:** Prisma 7.10.x (ikke 8-rc), TypeScript 6.0.x, Next.js 16 (`proxy.ts` i stedet for `middleware.ts`). Env-variabler bliver påkrævede i den milestone, der bruger dem.
- **Claude er med overalt hvor ChatGPT/Copilot nævnes** (skins, supportprompt, designsessioner).

## 11. Ejer-tid (mål)
Marco ≤ 2 timer/uge efter launch: 1-klik-godkendelse af indhold, læse daglig digest, håndtere eskalationer.
