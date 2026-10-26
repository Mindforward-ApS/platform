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

## 10b. Produktnavn (besluttet af Marco 13. okt 2026)
- Produktet hedder **Mindforward**. Domæne: `mindforward.dk` (købt af Marco). Afsender: `hej@mail.mindforward.dk` (SERVICE), `nyt@news.mindforward.dk` (MARKETING).
- Kodenavnet `greb` bevares internt (repo, Vercel/Neon/Sentry-projekter, filnavne). "Greb" i spec-dokumenterne betyder produktet Mindforward.
- Varemærke ikke tjekket: `mindforward.com` og `mindforward.eu` er i brug af andre → DKPTO/EUIPO-tjek før launch (launch gate).

## 10c. Arbejdsform (besluttet af Marco 13. okt 2026)
- **Tempo før ceremoni:** Marco vil se et færdigt produkt hurtigt og rette bagefter. Claude Code bygger milestones i træk og parallelt med flere agenter, hvor opgaverne ikke rører de samme filer. Planen skrives i PR'en i stedet for at vente på "Godkendt" pr. milestone.
- **Designsessioner flyttes til efter første gennemkørsel:** alt bygges med neutrale tokens; Marco vælger visuel retning, når han kan klikke hele produktet igennem. Designreglerne (ingen leverandør-look, tokens kun i `tokens.css`) gælder fortsat.
- Juridiske regler, sikkerhed og tests er uændrede krav.

## 11. Ejer-tid (mål)
Marco ≤ 2 timer/uge efter launch: 1-klik-godkendelse af indhold, læse daglig digest, håndtere eskalationer.


## 10d. Design (14. okt. 2026)

- Marco godkendte Mindforward-designsystemet ("Det ser godt ud") og bad om, at hele frontend og UI/UX bygges på det: "det skal ligne en million dollar AI-platform".
- Kilde: https://claude.ai/artifact/XQwYFamA9HLSbaAbYRhMyf. Kobolt (`accent`) som eneste brandfarve, rav kun til hints, Schibsted Grotesk + IBM Plex Mono (kun tal der tælles), lyst og mørkt tema (følger systemets indstilling).
- Logoet (prik + vinkel frem) er en retning; varemærket er ikke tjekket (se OPEN-QUESTIONS).
- Reglen "neutrale placeholders" i CLAUDE.md er erstattet af designsystemet. Funktion og tekster fjernes ikke i redesignet uden Marcos ja.
- Ikoner (14. okt. 2026): Marco valgte ikonsystem "E · App-ikoner" — farvefelter med blød gradient og hvidt, fyldt Phosphor-ikon i menu og på fremhævede steder; Phosphor-linjeikoner til små UI-ikoner. Moduler = åben bog med tekst, Min plan = to cirkler (ring + prik) uden pil. Gradienter er derfor tilladt, men kun i ikonfelter.
- Billeder (14. okt. 2026): modul-covers og forsidebilleder er fotorealistiske objektfotos lavet af Marco (én serie: lys sten/creme på pastelbaggrund, tom flade til venstre).
- Leverandørlogoer (14. okt. 2026): Marco besluttede — efter at være gjort opmærksom på reglen i CLAUDE.md ("ALDRIG … leverandørernes logoer") og varemærkerisikoen — at ChatGPT-, Microsoft 365 Copilot- og Claude-logoerne vises ved spornavnene i appens egen navigation (sidemenu og "Øv dig frit" på Hjem). Ikke i sandkassens chrome, ikke på marketing, ikke som godkendelse. Filer: `public/brands/` (kilde: billeder Marco fandt online; ingen licens). Skal godkendes af advokat før launch (OPEN-QUESTIONS).

- **15. okt. 2026 (Marco: "brug de samme design features som på websitet"):** appen bruger nu websitets formsprog. Font **Geist** i stedet for Schibsted Grotesk (IBM Plex Mono bliver), overskrifter i vægt 500 med tæt spatiering og større skala, brødtekst 17 px, runde hjørner 10/16/20 px, bløde lagdelte skygger, blødt lysfelt bag sideoverskrifter, indhold der glider blidt ind, spotlight på kort og tal der tæller op (alt slået fra ved "reducér bevægelse"). Fra 1800 px skaleres hele appen op i trin via rodens skriftstørrelse, og indholdet har en maksimal bredde (100rem). Farver, ikonfelter og logo er uændrede.

- **15. okt. 2026 — Øvemiljøet ligner desktop-apps (Marco: "Vi skal ligne dem så meget som muligt uden at ligne dem").** Hvert spor efterligner opbygningen og arbejdsgangen i den rigtige desktop-app: centreret hilsen + skrivefelt (Claude-sporet), "Hvad kan jeg hjælpe med?" + rundt skrivefelt (ChatGPT-sporet), app-bjælke + indbakke + chatpanel (Copilot-sporet), og forbindelser i en "+"-menu i skrivefeltet. Farver, skrift, ikoner, logo og navnet "Øvemodel" er Mindforwards; den faste disclaimer bliver. Erstatter "kun layout-regioner" i CLAUDE.md-designreglen. Advokat bør se på grænsen (trade dress) før lancering — noteret i OPEN-QUESTIONS.

## 10e. Rigtige connector-navne i øvemiljøet (besluttet af Marco 26. okt. 2026)
- Marco: **"Bare brug de rigtige connector-navne."** Øvemiljøets Forbindelser er et katalog med de rigtige navne fra Claudes connector-katalog (claude.com/marketplace, 879 remote connectors hentet 26. okt. 2026, `content/sandbox-connectors/catalog.json`, kilde-CSV ved siden af), fx Gmail, Google Drive, Microsoft 365, Slack, Notion, HubSpot.
- Grænser, der stadig gælder: navnene står **kun som tekst** (ingen logoer, farver, ikoner eller links); intet forbinder til den rigtige tjeneste — en forbindelse åbner kun Nordlys' øvedata (`data` i kataloget, fx Gmail → mail), resten har "ingen øvedata"; login er simuleret og siger det; den faste disclaimer og "Øvemodel" bliver.
- Flowet efterligner Claude: "Dine forbindelser" / "Find flere", søgning og kategorier, Forbind → simuleret login → tilstand pr. værktøj (Tillad altid / Spørg først / Blokeret), og hver forbindelse kan slås til og fra pr. chat i "+"-menuen.
- Gælder forud for docs/04 § 1 og § 3 om produktnavne i sandkassen for netop connector-navne. Funktionsnavne (Skills, Plugins …) er fortsat danske/neutrale, indtil Marco beslutter andet. Advokat skal se på det før launch (OPEN-QUESTIONS).

## 10f. Claude-øvemiljøet i samme opbygning som Claude (besluttet af Marco 26. okt. 2026)
- Marco: **"lave det præcis på samme måde som hvis du kigger på claude"** og **"når man trykker på tilpasning så kommer der skills, forbindelser og plugins frem … selvfølgelig kan man stadig se sidebaren"**. Ingen nye faner.
- Workpane-skallen (Claude-sporet) har nu Claudes struktur (set i Marcos egen Claude 26. okt. 2026): sidemenu Ny · Søg · Projekter · Artefakter · Planlagte · Tilpasning · Mere · Seneste · bruger; startskærm med hilsen, "Hvordan kan jeg hjælpe dig i dag?", "+"-menu (Upload eller tilføj filer · Skills › · Forbindelser › · Plugins › · Research · Hukommelse) og rækken under feltet (Projekt ▾ · Øvemodel + indsats · Automatisk); Tilpasning med Skills | Forbindelser | Plugins, Dine | Udforsk, søg, filter, sortering og "+ Tilføj" i hovedområdet.
- Funktionsnavnene "Skills" og "Plugins" bruges, som Marco selv skrev dem (afløser sidste punkt i § 10e). Skills- og plugin-navne er de rigtige navne som tekst (`content/sandbox-customize/catalog.json`); beskrivelserne er Mindforwards egne. At tilføje en skill/et plugin gemmes kun i sessionen (SETTING_CHANGED `skill-added` …).
- Nordlys' øvesystemer (Mail, Kalender, Filer, Kunder, Regneark) ligger under "Mere", så sidemenuen er den samme som i Claude. Modellen hedder stadig Øvemodel, der er ingen modelvælger (kun indsats), og farver/fonte er Mindforwards.

## 10g. ChatGPT-øvemiljøet i samme opbygning som ChatGPT (besluttet af Marco 26. okt. 2026)
- Marco: **"Gør det samme med chatgpt"** (samme princip som § 10f; set i Marcos egen ChatGPT 26. okt. 2026, kun menuer og sider, ingen samtaler åbnet).
- Sidebar-chat-skallen (ChatGPT-sporet): sidemenu Ny chat · Planlagt · Bibliotek · Plugins · Udforsk (Kort, Billeder, GPT'er, Websteder) · Projekter · Seneste · bruger, med søg som dialog; Chat | Work øverst; Chat = "Hvad har du på hjerte i dag?" med felt på én linje (+, indsats, mikrofon) og forslag under; Work = "Hvad skal vi arbejde på?" med boks, Vælg projekt · Filer · Plugins og "Se, hvad Work kan"; "+"-menu i værktøjets rækkefølge med korte forklaringer og dine plugins.
- Sider i hovedområdet: Planlagt (skriv en opgave, vælg hvornår, eller tag en anbefalet), Bibliotek (Nordlys' filer med Foreslået/Favoritter/Mapper/Billeder/Alle), Plugins | Skills (søg, Installerede, Offentlige/Personlige og værktøjets sektioner) og GPT'er (vores assistent-øvelse).
- Plugin-navnene og de korte beskrivelser er de rigtige som tekst (`content/sandbox-connectors/chatgpt-plugins.json`, 75 offentlige plugins i 16 sektioner), uden logoer; Gmail, Outlook, Google Drive, Dropbox, Notion, kalenderne, HubSpot og Data når Nordlys' øvedata, resten har ingen øvedata.
- Kort, Billeder, Websteder, Tegn, Arbejd i et projekt og egne skills står med "Kommer senere". Nordlys' Mail, Kalender, Kunder og Regneark ligger under Udforsk. Modellen hedder stadig Øvemodel; der er kun indsats, ingen modelvælger.

## 10h. Copilot-øvemiljøet i samme opbygning som Microsoft Copilot-appen (besluttet af Marco 26. okt. 2026)
- Marco: **"jeg har ikke en co-pilot konto!"** og **"Kan du prøve at lave en replica af co-pilot"**. Opbygningen er derfor taget fra Microsofts egne offentlige sider og skærmbilleder (set 26. okt. 2026): support.microsoft.com "Kom i gang med appen Microsoft Copilot" (skærmbillede af startskærmen), "Kom i gang med Microsoft Copilot Chat", "Kom i gang med agenter", "Microsoft-udviklede agenter", "Get started with Notebooks", "Add content and agents to Copilot Chat" og learn.microsoft.com "What's new in Copilot Cowork".
- Skallen (skin-nøglen `APP_RAIL_SIDE_PANEL` er beholdt, layoutet er nyt): sidemenu med Chat | Kollega, Ny chat · Søg · Bibliotek · Agenter (fold ud: tilføjede agenter + Alle agenter) · Notesbøger · Fastgjort · Chats · bruger med "Arbejde"-mærke og tandhjul; app-starteren (ni prikker) øverst åbner Nordlys' apps (Mail, Kalender, Filer, Kunder, Regneark). Over startskærmen: "Arbejds-IQ" og "Automatisk ▾" (Automatisk / Hurtigt svar / Tænk grundigere — tilstand, ikke modelvælger), beskyttet-skjold og ny chat. Startskærm "Hej Kim, hvordan kan jeg hjælpe?", "Meddelelse til Øvemodel" og chips Foreslået ▾ · Lær Øvemodel at kende · Forbered dig på, hvad der venter.
- "+"-menu: Tilføj arbejdsindhold · Upload billeder og filer · Vedhæft cloudfiler, så dine agenter og plugins. Søg søger i Nordlys' mails, møder, filer og kunder. Agenter = butik med kategorier og Microsofts otte agenter (navne som tekst), Tilføj/Åbn og Opret agent (vores assistent-øvelse). Notesbøger samler filer, møder og mails som referencer (gemmes kun i browseren i denne omgang). Kollega: Ny opgave · Automatiseringer · Tilpas (skills og plugins fra Cowork som tekst, `content/sandbox-customize/cowork.json`).
