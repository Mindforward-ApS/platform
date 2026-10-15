# 01 — Produkt: hvem, hvad, flows og skærme

> Kanonisk: `docs/00-beslutninger.md` (§ 10 går forud). Fakta/lov: `docs/research-fund.md`. Dybde: moduler/scoring `docs/05-moduler-og-scoring.md`, pensum `content/curriculum.md`, sandkasse `docs/04-sandkasse.md`, betaling `docs/07-betaling.md`, mails/samtykke `docs/09-email-og-marketing.md`, support `docs/08-support.md`, compliance `docs/10-compliance.md`, milestones `docs/11-roadmap.md`.
> Denne fil beskriver **funktion**, ikke visuelt design. Alle skærme bygges med placeholder-tokens; design laves skærm for skærm med Marco (beslutning § 8).

## 1. Vision
1. Greb gør almindelige danske medarbejdere trygge og dygtige til AI på arbejdet — ved at **gøre ting**, ikke se videoer.
2. Man øver i en neutral sandkasse med en fiktiv virksomhed (Nordlys Logistik ApS), så fejl er gratis og ingen rigtige data er i spil.
3. Hvert modul tager 5–12 minutter, giver en forklaret score og slutter med en færdighed, man kan bruge samme dag.
4. Indholdet holder sig selv ajour med værktøjerne (ChatGPT, Microsoft 365 Copilot og Claude — senere Gemini) via indholdsmotoren.
5. Virksomheder får et dokumenteret, rollebaseret tiltag efter AI-forordningens art. 4 — uden overvågning af medarbejdernes prompts.

## 2. Personas

| Persona | Hvem | Mål | Frygt/barriere | Hvad Greb skal gøre |
|---|---|---|---|---|
| **Medarbejder uden AI-erfaring** ("Lene", 52, lagerdisponent) | Har prøvet ChatGPT 2 gange, er usikker på hvad hun må | Spare tid på mails og planlægning uden at lave fejl | At dumme sig, at bryde regler, at blive "målt" | Korte trin, dansk hverdagssprog, tydelig "må jeg?"-træning, ros ved fremskridt, ingen tidspres |
| **Power user** ("Jonas", 31, salg) | Bruger AI dagligt, kender prompts | Lære assistenter, forbindelser, automationer, agenter | Kedes ved basics | Niveautest der lader ham springe over; Niveau 3; månedlige nyheder |
| **HR/admin** ("Mette", 44, HR-partner, 80 ansatte) | Skal "gøre noget ved AI" og dokumentere det | Overblik, rapport, nem udrulning | Bøvl, persondata, at det ligner overvågning | Invitér via domæne/SSO, statusoversigt, rapport (CSV/PDF), databehandleraftale, ingen prompt-tekster |
| **Privat bruger** ("Ali", 27, jobsøgende) | Betaler selv | Kunne skrive "AI-kompetencer" på CV'et | Abonnementsfælder | Gratis test + 3 moduler, klar pris, "Fortryd aftale", opsig i appen, certifikat |
| **SMV-ejer** ("Peter", 58, VVS-firma, 12 ansatte) | Beslutter og betaler | Få folk i gang uden kursusdage | Pris, tid, ved ikke hvor han skal starte | 14 dages prøve uden kort, færdig plan pr. rolle (drift/håndværk mobil-venligt), ét samlet beløb |

## 3. Jobs-to-be-done
- **Medarbejder:** "Når jeg får en opgave, hvor AI kunne hjælpe, vil jeg vide præcis hvordan — og hvad jeg ikke må — så jeg sparer tid uden at lave fejl."
- **Power user:** "Når værktøjet får nye funktioner, vil jeg hurtigt prøve dem af i en sikker ramme, så jeg kan bruge dem i mit arbejde før kollegerne."
- **HR/admin:** "Når ledelsen spørger 'hvad gør vi ved AI?', vil jeg kunne udrulle og dokumentere træning på få timer, så vi har et rollebaseret, dokumenteret tiltag."
- **Privat:** "Når jeg søger job, vil jeg kunne vise og forklare, at jeg kan bruge AI ansvarligt."
- **SMV-ejer:** "Når mine folk bruger AI på må og få, vil jeg have dem trænet uden at lukke værkstedet en dag."

## 4. Kerneflows

Ruter er funktionelle forslag (endelig struktur: `docs/02-arkitektur.md`). Kunde-admin ligger under `/virksomhed/*`; `/admin/*` er Marcos interne drift (docs/06, 08, 09).

### 4.1 Offentlig niveautest → signup → spor → plan → modul → certifikat
1. **Landingsside** (`/`) → CTA "Tag den gratis AI-niveautest (5 min)".
2. **Vælg værktøj** (`/niveautest`): ChatGPT · Microsoft 365 Copilot · Claude · "Ved ikke/flere" (→ ChatGPT-spor, kan skiftes). Copilot → spørg: "Har I Microsoft 365 Copilot-licens?" Ja / Nej, kun Copilot Chat / Ved ikke (→ `COPILOT_CHAT`). Valgfrit: rolle (salg, HR, økonomi, kundeservice, ledelse, drift/håndværk, andet).
3. **Testen:** 12 spørgsmål (QUIZ/SPOT_ERROR/JUDGMENT, ingen LLM-kald), statuslinje, ingen tidsgrænse, kan gennemføres på mobil. Svar gemmes anonymt (`PlacementResult` med `anonymousId`), rate limit + bot-beskyttelse.
4. **Resultatside** (vises **uden** krav om email/samtykke): niveau pr. område (model-forståelse, prompting, faktatjek, datasikkerhed, avancerede begreber), 3 konkrete anbefalinger, forslag til plan. Under: **ikke-forudafkrydset** checkbox "Ja tak, send mig tips og tilbud om AI-træning fra Greb på email" (frivillig, specifik) + email-felt → `ConsentRecord` + dobbelt opt-in (docs/09). Separat knap "Gem resultat og fortsæt gratis" → signup.
5. **Signup** (`/opret`): magic link, Microsoft eller Google. Resultatet flyttes fra `anonymousId` til brugeren. Ingen marketingsamtykke i signup ud over den samme frivillige, ikke-forudafkrydsede checkbox.
6. **Læringsplan** (`/plan`): moduler i rækkefølge (curriculum.md "Niveautest → plan"), status pr. modul (ikke startet / i gang / bestået / "kan springes over"), estimeret tid, næste modul fremhævet. B2C gratis: de 3 gratis moduler åbne, resten med lås + "Lås op" (→ 4.4).
7. **Modul** (`/modul/[slug]`): intro (mål, minutter, spor) → trin ét ad gangen (READ/DEMO/CLICK_TASK/PROMPT_TASK/QUIZ/SPOT_ERROR/JUDGMENT). Sandkasse-trin åbner sandkassen i opgavevisning (opgavepanel + sandkasse).
8. **Hints:** knap "Brug for hjælp?" → hint 1 (nudge) → hint 2 (konkret, ×0,75) → hint 3 "Vis løsning" med bekræftelse "Trinnet giver 0 point" (docs/05 § 5).
9. **Svar/feedback:** pr. trin straks feedback; PROMPT_TASK viser rubric-kriterier med scorer og 1-linjes feedback pr. kriterium, derefter øvemodellens svar på prompten; op til 3 indsendelser.
10. **Resultat** (`/modul/[slug]/resultat`): score i %, bestået/ikke bestået (≥ 80 % + must-pass), hvilke trin der trak ned, "Prøv igen" (bedste forsøg tæller), "Næste modul".
11. **Certifikat:** når alle påkrævede moduler i et spor-niveau er bestået → besked + PDF-download (`/certifikater`) + valgfri offentlig verifikationsside (`/certifikat/[id]`). Tekst: dokumenterer gennemført træning, ikke juridisk certificering (docs/05 § 8).

### 4.2 B2B: prøve → køb seats → invitér → følg status → rapport
1. **Start prøve** (`/virksomhed/start`): navn, email, virksomhedsnavn, CVR (opslag), evt. EAN (fase 2), antal ansatte (bucket). Ingen kort. Opretter `Organization(BUSINESS)` + `Membership(OWNER)` + trial (14 dage, ≤ 5 brugere; docs/07 § 6). Ét trial pr. CVR/domæne.
2. **Onboarding-tjekliste** (dashboard): ① vælg spor (ChatGPT/Copilot + licensniveau) ② invitér de første (≤ 5) ③ prøv selv et modul ④ download databehandleraftale ⑤ (valgfrit) link til jeres egen AI-politik.
3. **Invitér** (`/virksomhed/medarbejdere`): email (flere ad gangen, CSV-indsæt), invitationslink (udløber, kan nulstilles), verificeret domæne (DNS-TXT → alle med @domæne kan joine; Entra ID/Google SSO). Pr. invitation: rolle (LEARNER/ADMIN), spor, valgfri jobrolle (→ ROLE-moduler). Over seat-loftet: afvises med forklaring + "Tilføj pladser".
4. **Medarbejderen** modtager SERVICE-mail → accepterer → niveautest (spor forvalgt) → plan → moduler.
5. **Køb** ("Fortsæt med Greb", `/virksomhed/abonnement`): måned/år, antal seats (≥ 5), pris pr. bruger ex. moms + samlet beløb, momsnummer/CVR, kort via Stripe → aktiv. Seats kan op-/nedjusteres i appen (docs/07 § 4.3). Fakturaer/kort via Stripe-kundeportal.
6. **Følg status** (`/virksomhed`): pr. medarbejder: niveautest gennemført, moduler bestået/i gang, gennemsnitsscore, certifikater, seneste aktivitet (dato), månedspakke gennemført. Filtrér på spor, jobrolle, status. **Aldrig prompt-tekster** (§ 7).
7. **Rapport** (`/virksomhed/rapport`): vælg periode → **CSV + PDF**: "Dokumentation af AI-kompetencetiltag" — hvem er tilbudt træning, hvilke rolle- og sporspecifikke moduler, gennemførsel, certifikater, indholdsversioner, virksomhedens egne noter (fri tekst: "sådan bruger vi AI", link til AI-politik). Formulering: "dokumenteret, rollebaseret tiltag efter art. 4" — aldrig "certificering", "lovkrav", "påkrævet niveau" eller bøder (beslutning § 10). Under trial: vandmærke "Prøveperiode".
8. **Trial-udløb uden køb:** `READ_ONLY` — admin kan se status og eksportere; medarbejdere ser "Jeres prøveperiode er slut — kontakt [admin-navn]".

### 4.3 Månedlig cyklus
1. Den 1. i måneden opretter systemet `MonthlyCycle` pr. bruger med `MonthlyAssignment`s: nye `NEWS`-moduler for brugerens spor (og licensniveau) + 1 genopfriskning (lavest scorende eller ældst beståede CORE-modul). Mål ≤ 15 min.
2. SERVICE-mail dag 1 ("Din månedspakke er klar — ca. X min"), påmindelse dag 14 og 25 hvis ikke gennemført. **Aldrig tilbud** i disse mails. Brugeren kan slå påmindelser fra (`/konto/indstillinger`).
3. I appen: kort "Oktober-pakken" øverst på `/plan` med fremdrift.
4. Admin ser pr. medarbejder: månedspakke gennemført ja/nej (ikke svar).
5. Månedspakken kan ikke sænke tidligere beståede resultater.

### 4.4 B2C-køb (forbruger) inkl. fortrydelse
1. Udløser: låst modul, "Opgradér" i menu, eller resultatside.
2. **Checkout-side** (`/konto/opgrader`, eget UI før Stripe): vælg måned (49 kr) / år (490 kr) — beløb fra config/Stripe; hvad man får; "Fornyes automatisk. Opsig når som helst i appen"; links til vilkår og privatliv.
3. To **ikke-forudafkrydsede** checkbokse: (a) udtrykkeligt samtykke til at adgangen starter straks, (b) erkendelse af at fortrydelsesretten derved kan bortfalde (endelig ordlyd: docs/07 § 8.1 / advokat).
4. **Med fed, lige over knappen:** "49 kr pr. md. inkl. moms". Knappen hedder **"Køb"**.
5. Stripe Checkout (kort) → tak-side venter på webhook → adgang.
6. **Ordrebekræftelse på mail** (varigt medium): pris, vilkår, samtykke/erkendelse med tidspunkt, fortrydelsesinformation + link til "Fortryd aftale", sådan opsiger du.
7. **"Fortryd aftale"** synlig i 14 dage (i `/konto/abonnement`, app-footer, offentlig `/fortryd-aftale`, link i mail) → formular (navn, hvilken aftale, email; forudfyldt når logget ind) → knap **"Bekræft fortrydelse"** → kvittering på skærm + mail med dato/tid. Behandling/refusion: docs/07 § 8.6.

### 4.5 Opsigelse
- **B2C:** `/konto/abonnement` → "Opsig abonnement" → én bekræftelsesside ("Dit abonnement stopper [dato]. Du har adgang indtil da.") → "Bekræft opsigelse" → kvittering på mail. Ikke flere trin end tilmelding. Ingen fastholdelsestilbud. Fremskridt og certifikater bevares; kontoen falder tilbage til gratis niveau.
- **B2B (OWNER/ADMIN):** `/virksomhed/abonnement` → samme mønster, virkning ved periodens udløb. Derefter `READ_ONLY` i 90 dage (eksport af rapport/certifikater), herefter sletning efter databehandleraftalen (docs/10).
- **Medarbejder der forlader virksomheden:** admin fjerner → seat frigives; personens certifikater kan overføres til en personlig konto, hvis personen selv vælger det (link i SERVICE-mail).
- **Tag resultater med mellem egne konti (Marco 15. okt. 2026):** har brugeren beståede moduler eller certifikater i en anden af sine konti (typisk privat → virksomhed ved invitation, eller tidligere virksomhed → privat), vises kortet "Tag dine resultater med" på `/hjem` og `/certifikater` i den aktive konto. Ét samlet ja/nej pr. par af konti, ingen forudafkrydsning. Ja: beståede moduler tæller med oprindelig dato (`Assignment.source = CARRIED_OVER`, ingen forsøg/prompts kopieres), og certifikatet vises via `CertificateShare` — det udstedes ikke igen. Nej: intet deles. Virksomheden ser kun det, brugeren har sagt ja til. Valget logges (`CredentialTransfer` + `AuditLog`).
- **Slet konto** (`/konto/data`): eksport (JSON/PDF) og sletning (GDPR, docs/10).

## 5. Skærmoversigt (funktion — ikke design)

### Offentlige
| # | Skærm | Formål | Nøgleelementer |
|---|---|---|---|
| P1 | Landingsside `/` | Forklare værdien, starte test | Værdiløfte, "sådan virker det" (3 trin), sporvalg, CTA niveautest, B2B-sektion, priser fra config, sandkasse-disclaimer, footer m. juridiske links |
| P2 | Virksomheder `/virksomheder` | B2B-salgsside | Art. 4-budskab (korrekt formuleret), rapport-eksempel, admin-overblik, pris pr. bruger ex. moms, "Start 14 dages prøve" |
| P3 | Priser `/priser` | Pris og vilkår | B2C inkl. moms, B2B ex. moms, min. 5 brugere, årlig, hvad er gratis, fortrydelse/opsigelse kort forklaret |
| P4 | Niveautest `/niveautest` | Leadmagnet | Sporvalg, licensspørgsmål, rollevalg, 12 spørgsmål, statuslinje |
| P5 | Testresultat `/niveautest/resultat` | Vise niveau, konvertere | Niveau pr. område, anbefalinger, planforslag, frivillig samtykke-checkbox (ikke forudafkrydset), "Gem resultat og fortsæt" |
| P6 | Certifikat-verifikation `/certifikat/[id]` | Bevise ægthed | Navn, spor, niveau, dato, indholdsversion, ansvarsfraskrivelse |
| P7 | Fortryd aftale `/fortryd-aftale` | § 20 a uden login | Formular (navn, aftale, email), "Bekræft fortrydelse", kvittering |
| P8 | Juridiske sider | Vilkår, privatliv, cookies, tilgængelighed, databehandleraftale, underdatabehandlere, acceptabel brug, om sandkassen | Ejes af docs/10 |
| P9 | Hjælpecenter `/hjaelp`, `/hjaelp/{slug}` | Selvbetjening | Søgning, artikler, link til supportagent |

### Auth og onboarding
| # | Skærm | Formål | Nøgleelementer |
|---|---|---|---|
| A1 | Log ind / opret `/log-ind`, `/opret` | Adgang | Magic link, Microsoft, Google; frivillig marketing-checkbox kun ved opret |
| A2 | Tjek din mail | Magic link sendt | Gensend (rate-limited), skift email |
| A3 | Accepter invitation `/invitation/[token]` | Joine virksomhed | Virksomhedsnavn, inviteret af, SSO/magic link, udløbet-tilstand |
| A4 | Vælg spor (indlogget) | Første valg | Spor, licensniveau (Copilot), rolle → niveautest |

### Medarbejder/lærende
| # | Skærm | Formål | Nøgleelementer |
|---|---|---|---|
| L1 | Min plan `/plan` | Hjem | Næste modul, månedspakke-kort, moduler pr. niveau med status/tid, fremdrift pr. niveau, skift spor |
| L2 | Modulintro `/modul/[slug]` | Forventningsafstemning | Titel, mål, minutter, spor/licensmærkat, "Udfases"-banner fra registry, "Automatisk opdateret [dato] — kilde" for NEWS, start/fortsæt |
| L3 | Trinvisning (ikke-sandkasse) | READ/QUIZ/SPOT_ERROR/JUDGMENT | Trinindikator (x af y), indhold, svar, hint-knap, feedback (aria-live), næste |
| L4 | Opgavevisning m. sandkasse | CLICK_TASK/PROMPT_TASK/DEMO | Opgavepanel (instruktion, scenarie, hints, kriterier efter forsøg) + sandkasse (skin pr. spor, disclaimer, "Øvemodel"-mærke), tegntæller, indsend, PII-advarsel |
| L5 | Resultat | Score og læring | %, bestået, trin-oversigt, must-pass-forklaring, prøv igen, næste modul, certifikat-besked |
| L6 | Sandkasse frit spil `/sandkasse` | Øve uden opgave | Samme sandkasse, Nordlys-data, token-loft-besked |
| L7 | Mine certifikater `/certifikater` | Bevis | Liste, offentlig side til/fra; når den er slået til: "Tilføj til LinkedIn-profil" (LinkedIns egen formular, udfyldt), del opslag på LinkedIn, kopiér link, mail, telefonens delemenu; til CV: kopiér CV-linje, PDF (A4 liggende med QR til verifikation), badge (PNG). Kort til at tage resultater med fra anden konto |
| L8 | Månedspakke `/maaned/[yyyy-mm]` | Månedens træning | NEWS-moduler + genopfriskning, fremdrift |
| L9 | Konto `/konto/indstillinger` | Profil og præferencer | Navn, email, spor, rolle, påmindelser til/fra, marketingsamtykke til/fra (afmeld), sprog (senere) |
| L10 | Mine data `/konto/data` | GDPR | Eksport, slet konto, info om 30-dages sletning af prompt-tekster |
| L11 | Supportagent (panel) | Hjælp | Chat, handlinger jf. docs/08, "Skriv til et menneske" |

### Betaling (B2C)
| # | Skærm | Formål | Nøgleelementer |
|---|---|---|---|
| B1 | Opgradér `/konto/opgrader` | Lovligt køb | Plan, auto-fornyelse, 2 ikke-forudafkrydsede checkbokse, fed pris over knap, knap "Køb" |
| B2 | Tak `/konto/betaling/tak` | Bekræftelse | Venter på webhook, adgang bekræftet, kvittering sendt |
| B3 | Mit abonnement `/konto/abonnement` | Styring | Plan, næste betaling, "Fortryd aftale" (14 dage), "Opsig abonnement", link til Stripe-kundeportal |
| B4 | Opsig – bekræft | § 28 a | Slutdato, "Bekræft opsigelse", ingen tilbud |
| B5 | Fortryd – formular/kvittering | § 20 a | Som P7, forudfyldt |

### Virksomhedsadmin (OWNER/ADMIN)
| # | Skærm | Formål | Nøgleelementer |
|---|---|---|---|
| V1 | Start prøve `/virksomhed/start` | Trial | Virksomhedsdata, CVR, ingen kort, vilkår for virksomheder |
| V2 | Overblik `/virksomhed` | Status | Onboarding-tjekliste, nøgletal (inviteret/aktive/bestået/certifikater), trial-dage tilbage, månedspakke-gennemførsel |
| V3 | Medarbejdere `/virksomhed/medarbejdere` | Udrulning | Liste m. status/score/certifikater/seneste aktivitet, invitér (email/CSV/link), domæne, rolle/spor-tildeling, fjern, seats brugt/loft |
| V4 | Medarbejderdetalje | Fremskridt for én | Moduler (status, bedste score, dato), certifikater, månedspakker — ingen svar/prompts |
| V5 | Indstillinger `/virksomhed/indstillinger` | Org-opsætning | Navn, CVR, domæneverifikation, SSO, standardspor/licensniveau, link til egen AI-politik, påmindelsespolitik |
| V6 | Abonnement `/virksomhed/abonnement` | Betaling | Trial-status, "Fortsæt med Greb", seats ±, måned/år, kundeportal, opsig |
| V7 | Rapport `/virksomhed/rapport` | Art. 4-dokumentation | Periode, filtre, egne noter, eksport CSV + PDF, forhåndsvisning |
| V8 | Databehandleraftale | GDPR | Download/accept, underdatabehandlere |

## 6. Ikke-funktionelle krav
- **Sprog:** al UI på dansk via i18n-laget (engelsk senere). Hverdagssprog; Niveau 1-tekster LIX ≤ 40. Ingen engelske fagudtryk uden forklaring første gang.
- **Tilgængelighed:** WCAG 2.2 AA på alle skærme (detaljer for trin: docs/05 § 9). Tilgængelighedserklæring på `/tilgaengelighed`. Automatisk axe-test i Playwright på alle kerneflows; manuelt tastatur- og skærmlæsertjek (NVDA/VoiceOver) før launch.
- **Enheder:** sandkassetrin (CLICK_TASK, PROMPT_TASK med sandkasse, DEMO) er **desktop-first** (≥ 1024 px; på mobil vises "Fortsæt på computer" + mulighed for at sende link til sig selv). READ, QUIZ, SPOT_ERROR, JUDGMENT, niveautest, resultat, plan, certifikater, abonnement og admin-overblik skal fungere fra 360 px. Moduler uden sandkassetrin (fx `role-ops-01`) mærkes "Kan tages på mobil".
- **Performance-budgetter** (mobil 4G, p75, målt med Vercel Speed Insights/PostHog):
  - Offentlige sider: LCP ≤ 2,0 s, INP ≤ 200 ms, CLS ≤ 0,1; JS ≤ 150 KB gzip for landingsside og niveautest.
  - App-sider: LCP ≤ 2,5 s; trinskift ≤ 300 ms (næste trin prefetches).
  - Sandkasse: interaktiv ≤ 3,0 s på desktop; lazy-loades kun på sandkassetrin.
  - Øvemodel: første token ≤ 2,0 s p75 (streaming). PROMPT_TASK-bedømmelse ≤ 6 s p75, timeout 15 s (docs/05 § 4).
  - API (ikke-LLM): ≤ 300 ms p95.
- **Pålidelighed:** besvarede trin gemmes straks server-side; afbrudt modul kan genoptages på trinniveau.
- **Region og data:** al persondata i EU (Neon Frankfurt, Vercel `fra1`, PostHog EU). Underdatabehandlere oplistet (docs/10).

## 7. Privacy-by-design
- **Admins ser status, score, certifikater og aktivitetsdatoer — aldrig prompt-tekster, svar i fritekst eller sandkasse-indhold.** Håndhæves i datalaget (admin-queries kan ikke selecte prompt-felter) og testes (roadmap M7).
- **Prompt-tekster slettes efter 30 dage** (Inngest-cron); scores og kriterie-scorer bevares.
- **Scores er læring, ikke overvågning:** ingen ranglister mellem kolleger, ingen "langsomste medarbejder", ingen tid-pr.-trin til admin. Medarbejderen ser på `/konto/data`, præcis hvad admin kan se.
- **Ingen rigtige data i sandkassen:** PII-filter klient + server advarer/blokerer CPR, kort- og kontonumre m.m. (docs/04). Forbindelser/automationer øves kun mod Nordlys-data.
- **Dataminimering:** niveautesten kræver ingen email. Analytics (PostHog EU) uden prompt-indhold; session replay slået fra på sandkasse- og prompt-felter.
- **Roller:** Greb er databehandler for B2B-kunders medarbejderdata og dataansvarlig for B2C og marketing (docs/10).
- **Samtykke** til marketing er altid separat, frivilligt og ikke forudafkrydset; påmindelser er SERVICE og indeholder aldrig tilbud.

## 8. Uden for MVP
- Spor `GEMINI` (datamodellen understøtter det; fase 2).
- Offentlige kunder med EAN/e-faktura via e-conomic (fase 2).
- MobilePay (kan ikke køre abonnementer via Stripe).
- Stripe Tax og OSS-moms for EU-forbrugere (dansk moms beregnes selv i MVP).
- Engelsk UI (i18n-klar, ikke oversat).
- Grundforløb som separat produkt/pris og ansøgning til kompetencefonde (indhold defineret i curriculum.md; salg senere).
- Live websøgning, rigtig billedgenerering og rigtige connectors i sandkassen (alt simuleret/forberedt).
- Egne virksomhedsmoduler/upload af egen AI-politik som modul, LMS-integration (SCORM/xAPI), SCIM-provisionering.
- Native mobilapp; offline.
- Ranglister, badges/gamification ud over certifikater.
- Manager-visning under admin-niveau (teamleder ser kun sit team).
- B2C-prøveperiode på betalt plan (gratis niveau i stedet; docs/07 § 7).
