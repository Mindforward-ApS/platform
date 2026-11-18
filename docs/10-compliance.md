# 10 — Compliance (ingeniør-tjekliste)

> Kanonisk: `docs/00-beslutninger.md` (§1, §7, §10). Lovhenvisninger kun fra `docs/research-fund.md`; alt andet er markeret `[JURA: verificeres]`. Dette er en byggetjekliste, ikke juridisk rådgivning — **advokatgennemgang før launch** (§9).
> Hvert punkt har et **bevis** (test, fil eller side), så Claude Code kan afkrydse det i milestone-PR'en.

## 1. GDPR

### 1.1 Roller
| Behandling | MindForward er | Bevis |
|---|---|---|
| B2B: medarbejderes konto, fremskridt, scores, certifikater, prompts i sandkassen | **Databehandler** for kunden (research-fund: GDPR) | DPA indgået pr. kunde (§1.2) |
| B2C-brugere, B2B-admins som kontaktpersoner, fakturering, marketing, support, sikkerhedslogs | Dataansvarlig | Privatlivspolitik |
| Leverandører (nedenfor) | Underdatabehandlere | `/underdatabehandlere` |

### 1.2 Databehandleraftale (DPA)
- [ ] Baseret på **Datatilsynets skabelon** (https://www.datatilsynet.dk/regler-og-vejledning/blanketter-og-skabeloner), udfyldt med MindForwards behandlinger, bilag om sikkerhed, underdatabehandlere, overførsler, sletning. Tekst i `content/legal/dpa.v1.md`.
- [ ] Indgås digitalt ved B2B-oprettelse (OWNER accepterer på vegne af virksomheden: navn, titel, CVR, tidspunkt, version → `AuditLog(action=DPA_ACCEPTED)`), før første invitation kan sendes. PDF-kopi sendes til OWNER (SERVICE).
- [ ] Generel forhåndsgodkendelse af underdatabehandlere med varsel (fx 30 dage) ved ændringer via mail til OWNER + side-changelog `[JURA: verificeres — varselsperiode]`.

### 1.3 Underdatabehandler-side (`/underdatabehandlere`, offentlig)
Tabel genereret fra `content/legal/subprocessors.json` (navn, formål, data, lokation, overførselsgrundlag, link):
Vercel (hosting, `fra1`) · Neon (database, AWS Frankfurt) · Anthropic (LLM: sandkasse, bedømmelse, support, indholdsmotor) · Stripe (betaling) · Resend (email) · Inngest (jobs) · PostHog EU Cloud (produktanalyse) · Sentry (fejl) · e-conomic + Pairy/Integrationspartner (bogføring) · GitHub (kun indholdsmotorens issues — ingen persondata).
- [ ] For hver ikke-EU-leverandør: overførselsgrundlag (EU-US Data Privacy Framework/SCC) og datalokation verificeret og noteret `[JURA: verificeres pr. leverandør]`. Anthropic: tjek mulighed for EU-databehandling/zero data retention og at API-data ikke bruges til træning `[verificér aktuelle vilkår]`.
- [ ] Sentry: `sendDefaultPii: false`, scrub af request bodies; EU-region `[verificér]`. PostHog: EU Cloud, ingen session replay på sandkasse- og prompt-felter, IP-anonymisering.

### 1.4 Opbevaring (retention) — håndhæves af Inngest cron `privacy/retention.daily`
| Data | Opbevaring | Mekanik |
|---|---|---|
| Prompt-tekster i sandkasse og `PROMPT_TASK` (`SandboxEvent`, `StepResult` fritekst, LLM-svar) | **30 dage** (beslutningslog §10) | fritekst-felter nulstilles/slettes; score, rubric-version, model-id bevares |
| `SupportMessage` | 12 mdr. efter sidste besked | slet samtale |
| Score, `Attempt`, `StepResult` (uden fritekst), `Certificate` | Så længe kontoen findes | slet ved kontosletning |
| B2B-org efter ophør | 90 dage read-only (`docs/07-betaling.md` §3), derefter sletning af medarbejderdata | cron + mail til OWNER 14 dage før |
| Inaktiv B2C-gratiskonto | 24 mdr. inaktivitet → varsling → sletning | cron |
| `PlacementResult` uden konto | 90 dage | cron |
| `ConsentRecord` | Samtykkets levetid + 5 år (dokumentation) `[JURA: verificeres]` | — |
| Fakturaer/bogføringsdata | 5 år (bogføringsloven) `[JURA: verificeres]` — i Stripe/e-conomic | ikke i app-DB |
| `AuditLog` | 2 år `[JURA: verificeres]` | cron |
| Rå kildesider (indholdsmotor) | 90 dage | — |
| Server-logs (Vercel) | ≤ 30 dage | platform-indstilling |
- [ ] Test: retention-job sletter præcis det i tabellen (fixtures med datoer).

### 1.5 Registreredes rettigheder
- [ ] `GET /api/me/export` → ZIP (JSON + CSV): profil, memberships, forsøg/scores, certifikater (PDF), samtykker, supportsamtaler, emails sendt (metadata). Asynkront (Inngest) → download-link på mail (SERVICE), udløber 7 dage. Rate limit 1/døgn.
- [ ] `POST /api/me/delete` → bekræftelse med magic link → sletning/anonymisering inden 30 dage; B2B-learner: membership fjernes, admin får besked (uden indhold). OWNER kan ikke slettes før ejerskab er overdraget eller org lukket. Stripe Customer bevares (bogføring) men frakobles personen.
- [ ] B2B: OWNER/ADMIN kan slette medarbejder og eksportere org-data (`/admin/data`) — som databehandler efter kundens instruks.
- [ ] Indsigt/rettelse via `/konto/data`; øvrige anmodninger → `Escalation(DATA_REQUEST)` (svarfrist 1 måned `[JURA: verificeres]`).

### 1.6 Medarbejderovervågning og DPIA
- [ ] **Admins ser status, score og certifikater — aldrig prompt-tekster** (beslutningslog §10). Håndhævet i query-laget (admin-queries selecter aldrig fritekst-felter) + test der fejler hvis et admin-endpoint returnerer fritekst.
- [ ] **Streak og ugentligt tjek-ind (beslutning § 10b):** admin ser dem kun som samlede tal og kun når mindst 5 personer indgår; tjek-ind er frivilligt og uden fritekst; begge nævnes i info til medarbejdere ved første login og i DPIA-noten.
- [ ] **Teammål** viser kun samlet fremdrift — aldrig navne eller rækkefølge.
- [ ] **Kontekstbibliotek og personalisering (beslutning § 10b + § 10c):** erhverv — MindForward er databehandler; privat — MindForward er dataansvarlig. Behandlingen (inkl. at indholdet sendes til sprogmodellen hos underdatabehandleren for at personalisere undervisningen) skal stå i DPA'ens bilag og i privatlivspolitikken `[JURA: verificeres før launch]`. Ejeren advares mod kundedata, andres persondata og forretningshemmeligheder; PII-filter ved gem og før hvert LLM-kald; erhverv: kun OWNER/ADMIN kan skrive. Teksten logges ikke og indgår ikke i analytics. Ejeren kan slette når som helst; afledt personaliseret tekst slettes med. **Sendes aldrig til sandkassen, øvemodellen eller bedømmelsen** (test).
- [ ] Privat bruger får ved første brug af kontekstbiblioteket en kort forklaring: hvad det bruges til, at teksten behandles af en sprogmodel, og hvordan den slettes. Bekræftelser (`ContextAcknowledgement`) er persondata om medarbejderen og vises for admin som version + dato.
- [ ] Ingen rangering/leaderboard af navngivne medarbejdere — heller ikke efter MVP (beslutning § 10b); virksomhedsrapporten viser gennemførelse og beståede moduler (dokumentation), ikke "dårligste medarbejdere".
- [ ] Positionering i UI/markedsføring: "læring", ikke "overvågning" (Datatilsynets 2026-fokus, research-fund).
- [ ] Info til medarbejdere ved første login (B2B): hvad admin kan se, hvad admin ikke kan se, opbevaring, link til kundens + MindForwards privatlivstekst.
- [ ] **DPIA-note** `docs/legal/dpia-note.md` (intern): systematisk vurdering af scores i ansættelsesforhold + LLM-bedømmelse af fritekst; konklusion om fuld DPIA er nødvendig `[JURA: verificeres]`. Opdateres ved nye features der behandler medarbejderdata.

### 1.7 Dataminimering og sikkerhed i sandkassen
- [ ] PII-filter klient + server (CPR, kort, kontonumre m.m.) før LLM og før lagring — se `docs/04-sandkasse.md`.
- [ ] Sandkassen kalder aldrig rigtige tredjeparter; kun Nordlys-data.
- [ ] Ingen brugerdata i seed/tests/fixtures.

### 1.8 EU-hosting
- [ ] Neon AWS Frankfurt; Vercel function region `fra1`; PostHog EU; Inngest/Resend/Sentry-region verificeret og noteret i `subprocessors.json`.

## 2. Forbrugerret (B2C) — implementeret i `docs/07-betaling.md` §8
- [ ] Før køb: totalpris inkl. moms, pris pr. periode, **med fed lige over knappen**; knap hedder **"Køb"** (FAL § 12). Bevis: e2e asserter DOM-rækkefølge og knaptekst.
- [ ] Automatisk fornyelse og opsigelsesvilkår vist i flowet, ikke kun i betingelser.
- [ ] Straks-adgang: udtrykkeligt samtykke + erkendelse (ikke forudafkrydset) + bekræftelse på varigt medium (FAL § 18 stk. 2 nr. 13, § 13 stk. 2). Mangler noget, kan forbrugeren fortryde uden betaling (§ 25). Bevis: `ConsentRecord` med tekstversion; ordrebekræftelse med samtykketekst + betingelser som PDF.
- [ ] **"Fortryd aftale"-knap** synlig hele fortrydelsesperioden → formular (navn, aftale, email) → **"Bekræft fortrydelse"** → kvittering på varigt medium med dato/tid (FAL § 20 a, lov 723/2025, i kraft 19. juni 2026). Bevis: e2e med test clock.
- [ ] Opsigelse online i appen lige så nemt som tilmelding (FAL § 28 a); højst 1 md. varsel efter 5 mdr. (§ 28). Bevis: e2e ≤ 2 klik.
- [ ] Gratis prøveperiode for forbrugere: findes ikke i MVP. Indføres den: vis pris efter prøven, frekvens, automatisk fortsættelse i flowet.
- [ ] Uanmodede opkald til forbrugere: forbudt (FAL § 4) — ingen telefonsalg til B2C.
- [ ] **Uafklaret:** digitalt indhold vs. tjenesteydelse → advokat (§9). Fortrydelsesknap og fuld refusion bygges uanset.

## 3. Markedsføringsret — implementeret i `docs/09-email-og-marketing.md`
- [ ] Email/SMS-marketing kun med forudgående samtykke — også B2B og navngivne medarbejdere (MFL § 10 stk. 1). Bevis: send-time consent gate + unit tests.
- [ ] Samtykke: aktivt, frivilligt, specifikt, ikke i handelsbetingelser, ikke indhentet via email; flow dokumenteret; dobbelt opt-in.
- [ ] Hver marketingmail: tydeligt markedsføring, afsender, klare betingelser, gratis afmelding.
- [ ] SERVICE-mails uden tilbud/upsell (CI-scan af templates).
- [ ] Rabatter: reel førpris, maks ~10 dage eller annonceret slutdato, aldrig længere end halvdelen af normalprisperioden; introduktionstilbud tydeligt mærket (Forbrugerombudsmandens retningslinjer for prismarkedsføring). Bevis: `create-promo`-validering.
- [ ] **Ingen falsk tidsbegrænsning / nulstillende nedtællere** (MFL bilag 1 nr. 7). Bevis: nedtæller-komponent tager kun server-`expires_at`.
- [ ] Ingen kolde mails (B2B eller B2C). B2B-telefon OK med frameldingsoplysning; Robinsonlisten for enkeltpersoner.
- [ ] Annonce-automatik: hårdt loft 20.000 kr/md i kode; ingen LinkedIn-beskedautomatik/scraping.
- [ ] Cookie-/sporingssamtykke for annoncepixels og ikke-nødvendig analyse `[JURA: verificeres — cookiebekendtgørelsen]`; banner med "Afvis" lige så let som "Accepter".
- [ ] Sammenlignende reklame, testimonials, "Danmarks bedste" o.l.: kun med dokumentation `[JURA: verificeres]`.

## 4. Varemærker og UI (research-fund: GDPR og varemærker; beslutningslog §1, §10)
- [ ] Ingen leverandør-logoer, varemærkefarver, fonte, ikoner, skærmbilleder eller "look and feel"/trade dress i produkt-UI, marketing eller certifikater. Sandkassen har egen visuel identitet; skins = layout-regioner + generiske menubegreber.
- [ ] Produktnavne kun beskrivende ("Lær Microsoft 365 Copilot"); aldrig i MindForwards egne produkt-/plan-/modulnavne på en måde der antyder tilknytning. **Intet "GPT" i MindForwards produktnavne** (OpenAI brand-retningslinjer). Bevis: lint-regel/CI-grep på `content/` og i18n-filer for forbudte mønstre (`GPT` i titler på MindForward-produkter, "officiel", "certificeret af", "partner").
- [ ] Fast disclaimer i sandkassen: "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google." Også i footer på marketing-sider og på certifikat-PDF.
- [ ] Chatsvar mærket "Øvemodel"; aldrig påstand om at ChatGPT/Copilot svarer.
- [ ] Microsoft Learn-indhold (CC BY 4.0): kreditering på moduler der bygger på det (`docs/06-indholdsmotor.md` §6).
- [ ] Indholdsmotoren skriver med egne ord + link; ingen kopiering af kildetekst.
- [ ] Varemærkesøgning på "MindForward" (DKPTO/EUIPO) + domæne før launch `[JURA: verificeres]`.

## 5. AI-forordningen — budskab (research-fund: art. 4, forordning (EU) 2026/1744)

| Tilladt | Forbudt |
|---|---|
| "Dokumenteret, rollebaseret tiltag efter art. 4" | "Lovkrav om certificering" / "AI Act-certificering" |
| "Art. 4 kræver, at virksomheder tager tiltag, der understøtter medarbejdernes AI-kompetencer" | "Påkrævet niveau", "I skal bestå …" |
| "Virksomhedsrapporten dokumenterer, hvad jeres medarbejdere har trænet" (dokumentation anbefales) | Bødetrusler, "undgå bøder", frygtretorik |
| "Gælder virksomheder, hvis medarbejdere bruger fx ChatGPT eller Copilot i arbejdet" | "Certifikatet opfylder AI-forordningen" / "godkendt" |
| "Virksomhedsrapporten følger opbygningen i Dansk Standards vejledning DS/PAS 2500-4" (først når ordlyden er verificeret) | "Opfylder DS/PAS 2500-4" / "godkendt af Dansk Standard" |
| | Navngivning af tilsynsmyndighed for art. 4 (Digitaliseringsstyrelsen er national koordinerende myndighed, men hvem der fører tilsyn med art. 4, er uafklaret) |
| "AI Act og ansvarlig brug" som navn på et emneområde | "AI Act-certifikat", "AI Act-bevis", "AI Act-godkendt" |
| | "Kun 10 % af træning overføres til jobbet" og andre udokumenterede tal; opdigtede kunderesultater |

- [ ] `banned-claims`-listen (`src/server/content-engine/banned-claims.ts`) bruges også på marketing-sider, i18n-filer, email-templates og support-output (CI-grep + runtime-guard).
- [ ] Virksomhedsrapporten er en selvstændig feature, ikke "compliance-bevis".
- [ ] Certifikat-tekst: "har gennemført …" — ingen henvisning til lovkrav.
- [ ] Transparens: supportchat og sandkasse mærket som AI `[JURA: verificeres — art. 50 og ikrafttræden]`.

## 6. Tilgængelighed
- [ ] WCAG 2.2 AA som mål (tastaturnavigation i sandkassen, fokusmarkering, kontrast via tokens, skærmlæser-labels, ingen tidsgrænser i opgaver uden mulighed for forlængelse).
- [ ] Automatisk check: `@axe-core/playwright` i e2e på alle hovedsider; 0 "serious/critical".
- [ ] Tilgængelighedserklæring-side `[JURA: verificeres — om EU's tilgængelighedsdirektiv/lov om tilgængelighedskrav gælder for MindForward som mikrovirksomhed]`.
- [ ] Animerede `DEMO`-trin respekterer `prefers-reduced-motion` og kan pauses.

## 7. Sikkerhed
- [ ] **2FA (TOTP/passkey) påkrævet** for interne `GREB_ADMIN` og anbefalet/kan kræves for kunde-OWNER/ADMIN (org-indstilling). Better Auth 2FA-plugin `[verificér]`.
- [ ] Authz-helper i hver server action/route handler; org-scoping på hver query; cross-org-tests.
- [ ] Webhook-signaturer (Stripe, Resend) verificeres før parsing.
- [ ] Rate limits på auth, AI-endpoints, checkout, offentlig fortrydelsesformular, eksport.
- [ ] Secrets kun server; `NEXT_PUBLIC_*` gennemgået; secret scanning i GitHub; Dependabot/Renovate.
- [ ] Security headers: CSP (nonce-baseret), HSTS, `X-Frame-Options: DENY` (undtagen hvor Stripe kræver), `Referrer-Policy`.
- [ ] `AuditLog` for admin-handlinger, rolleændringer, abonnement, indholdspublicering, kill switches, ads-ændringer, DPA-accept.
- [ ] Backups: Neon point-in-time restore verificeret (restore-øvelse før launch).
- [ ] Prompt-injection-værn: sandkasse/support/indholdsmotor behandler bruger- og kildetekst som data; tools self-scoped; output-guards.
- [ ] Hændelsesplan `docs/legal/incident-runbook.md`: brud på persondatasikkerheden → vurdering + anmeldelse til Datatilsynet inden 72 timer `[JURA: verificeres]` + underretning af B2B-kunder (databehandlerpligt) uden unødig forsinkelse.
- [ ] **Pen-test (ekstern) før skalering af B2B** (fx før første kunde > 50 seats eller offentlig kunde). Indtil da: OWASP ASVS L1-selvtjek + `pnpm audit` i CI.

## 8. Juridiske sider (alle versionerede i `content/legal/`, version + dato vist, ændringslog)
| Side | Route | Note |
|---|---|---|
| Handelsbetingelser — forbruger | `/vilkaar/forbruger` | fortrydelse, fornyelse, opsigelse, refusion; PDF i ordrebekræftelse |
| Handelsbetingelser — virksomhed | `/vilkaar/virksomhed` | seats, min. 5, prøveperiode, betaling, ansvarsbegrænsning, DPA som bilag |
| Privatlivspolitik | `/privatliv` | dataansvarlig-behandlinger; B2B-medarbejder-afsnit |
| Databehandleraftale | `/databehandleraftale` | Datatilsynets skabelon |
| Underdatabehandlere | `/underdatabehandlere` | fra `subprocessors.json` |
| Cookiepolitik | `/cookies` | + samtykkebanner |
| Fortrydelse | `/fortryd-aftale` | offentlig formular (`docs/07-betaling.md` §8.4) |
| Fortrydelsesformular (standard) | i betingelser + ordrebekræftelse | `[JURA: verificeres]` |
| Ansvarlig brug / acceptabel brug | `/acceptabel-brug` | ingen rigtige persondata i sandkassen |
| Om sandkassen / varemærker | `/om-sandkassen` | disclaimer, beskrivende brug af produktnavne |
| Tilgængelighedserklæring | `/tilgaengelighed` | se §6 |
| Kontakt + virksomhedsoplysninger | `/kontakt` | selskab (Esther Gruppen ApS-struktur), CVR, adresse, email |
| Bot-info (indholdsmotor) | `/bot` | `docs/06-indholdsmotor.md` §2 |

## 9. Launch-gate (alle skal være ✅ før første betalende kunde)

**Jura**
- [ ] **Advokatgennemgang: digitalt indhold vs. tjeneste, handelsbetingelser (forbruger + virksomhed), UI/varemærker** (sandkasse-skins, produktnavne, disclaimer, navnet "MindForward").
- [ ] Advokat har godkendt: samtykke-/erkendelsestekster ved checkout, fortrydelsesflow og refusionspraksis, marketing-samtykketekst, DPA-udfyldning, AI-forordnings-budskaber på landingsside.
- [ ] Alle `[JURA: verificeres]` i docs 06–10 er afklaret eller bevidst udskudt med note i `docs/OPEN-QUESTIONS.md`.
- [ ] Varemærke-/domænetjek af "MindForward".

**Produkt/kode**
- [ ] e2e grøn: B2C-køb (fed pris, "Køb", checkbokse), "Fortryd aftale" → kvittering → refusion, opsigelse ≤ 2 klik, B2B-trial → konvertering, DPA-accept før invitation.
- [ ] Consent gate unit tests grønne; SERVICE-template-scan grøn; banned-claims-scan grøn på `content/`, i18n, templates.
- [ ] Admin kan ikke se prompt-tekster (test); retention-job kører (prompts 30 dage).
- [ ] Eksport og sletning virker end-to-end.
- [ ] Disclaimer + "Øvemodel" synlig i alle skins; ingen leverandør-assets i repo (`scripts/check-assets.ts`: ingen filer/URL'er fra leverandørdomæner i `public/`).
- [ ] axe: 0 serious/critical.
- [ ] 2FA på alle interne admin-konti; secrets roteret fra udvikling; backups testet.
- [ ] Support-evals ≥ 90 %, 100 % på kritiske.
- [ ] Budgetlofter aktive: AI (80 %-alarm), indholdsmotor, ads 20.000 kr.

**Drift/bogføring**
- [ ] e-conomic + Pairy/Integrationspartner koblet til Stripe; testafstemning af én måned i testmode/første rigtige transaktion.
- [ ] Stripe-konto: dansk sælgerinfo, fakturaprefix, Smart Retries, Stripes egne kunde-mails om fejlede betalinger slået fra, Customer Portal-config.
- [ ] SPF/DKIM/DMARC på `mail.` og `news.`; `List-Unsubscribe` testet.
- [ ] Juridiske sider (§8) publiceret med version og dato.
- [ ] Underdatabehandler-liste og overførselsgrundlag verificeret.
