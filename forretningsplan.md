# MindForward — Forretningsplan og automatiseret marketing

> Version 12. okt. 2026. Bygger kun på `docs/00-beslutninger.md` (afsnit 10 går forud) og `docs/research-fund.md`.
> Kontekst for forretningen, ikke byggekrav. Ved konflikt vinder `docs/00-beslutninger.md`.
> Tal markeret "estimat" er antagelser. Kun Stripe-gebyrer er faste priser.

---

## 1. Kort fortalt

- **Hvad:** MindForward er en dansk webapp, hvor medarbejdere lærer ChatGPT, Microsoft 365 Copilot og Claude ved at *gøre ting* i en sandkasse. Ingen webinarer og ingen videoer. Det tager 15 minutter om måneden at holde sig opdateret.
- **For hvem:** SMV'er med 10–250 ansatte (B2B) og privatpersoner (B2C).
- **Hvorfor nu:** 42 % af danske virksomheder bruger AI, men 45 % bruger det kun ad hoc. Manglende kompetencer er den største barriere. AI-forordningens art. 4 kræver nu "tiltag, der understøtter" AI-kompetencer, og værktøjerne skifter hver måned.
- **Pris:** 49 kr/bruger/md ex. moms (B2B, min. 5 brugere). 49 kr/md inkl. moms (B2C). Årspris 490 kr.
- **Fordelen:** MindForward er den eneste danske sandkasse på tværs af værktøjer. Den måler kompetence med score i stedet for gennemførelse, holder sig selv opdateret via indholdsmotoren og laver dokumentationsrapporten til art. 4. Prisen er en brøkdel af en kursusdag til 4.000–6.000 kr.

---

## 2. Rettelser til den oprindelige idé

| # | Det ville du | Problem | Det gør vi i stedet | Kilde |
|---|---|---|---|---|
| a | Sandkassen skal ligne ChatGPT/Copilot | Microsoft og Google forbyder efterligning af deres "trade dress" (look and feel). Microsoft-skærmbilleder må ikke stå i dit eget produkt-UI. OpenAI tillader ikke "GPT" i produktnavne eller antydning af godkendelse. Brugerflader kan desuden være beskyttet af ophavsret og EU-designforordningen. | Sandkassen får **egen visuel identitet**. Skins må kun spejle layout-regioner og generiske menubegreber. Der må ikke være logoer, farver, fonte, ikoner eller skærmbilleder fra leverandørerne. Fast disclaimer: "Øvemiljø. Ikke tilknyttet eller godkendt af …". Svar mærkes "Øvemodel". En advokat gennemgår løsningen før launch. | [Microsoft](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks) · [OpenAI](https://openai.com/brand/) · [Anthropic](https://www.anthropic.com/legal/trademark-guidelines) · [Google](https://partnermarketinghub.withgoogle.com/brands/google/trademarks-and-terms/trademark-guidelines-for-proper-usage/) |
| b | Modulerne skal laves helt automatisk | Et modul med fejl i en sandkasse-opgave eller i grundpensum ødelægger tilliden og kan lære folk forkerte ting. | **Kun `NEWS`-moduler** (læsetekst og quiz, ingen ny sandkasse-UI) auto-publiceres, og kun når en uafhængig verifikator-model har tjekket hver påstand mod kilden. Alt andet lægges som kladde i `IN_REVIEW` og kræver **1-klik-godkendelse** fra dig. Der er kill switch og rollback. | 00-beslutninger § 4 |
| c | "Send 20 %-rabatmails til interesserede" | Marketingmail kræver forudgående, aktivt samtykke. Det gælder **også virksomheder og navngivne medarbejdere**. En mailadresse fra en gratis test tæller ikke som et køb. Førprisen skal være reel, og et tilbud må højst vare ~10 dage eller have en annonceret slutdato (aldrig mere end halvdelen af normalprisperioden). Falsk tidsbegrænsning er forbudt uanset omstændighederne. Bøden for vildledende tilbud kan være 4,25 mio. kr. (sep. 2026). | Mail kun til folk med registreret samtykke (`ConsentRecord`) og dobbelt opt-in. Rabatter er reelle, maks. 10 dage eller med annonceret slutdato. Ingen nedtællere, der nulstilles, og ingen "kun i dag". Introduktionstilbud er OK, hvis de er tydeligt mærket. | [MFL § 10](https://www.retsinformation.dk/eli/lta/2024/1420) · [Spamvejledning](https://forbrugerombudsmanden.dk/media/bjajzdv1/vejledning-om-spamforbuddet-2021-a.pdf) · [Prismarkedsføring](https://forbrugerombudsmanden.dk/publikationer/retningslinjer-og-vejledninger/vejledninger-longreads/retningslinjer-for-prismarkedsfoering) |
| d | "Jeg skal ikke røre en finger" | Ingen kanal giver de første B2B-kunder helt uden arbejde. Annoncer er låst til 20.000 kr/md, og indholdet skal godkendes. | Regn realistisk med **~2 timer/uge** efter launch: godkendelser, digest og eskalationer. Dertil kommer **telefonsalg til de første 20 B2B-kunder**. B2B-opkald er lovlige (oplys om frameldingsret, og respektér Robinsonlisten for enkeltpersoner). Uanmodede opkald til forbrugere er forbudt. Dine 6+ år med outbound er den hurtigste vej. | [Telefonsalg](https://forbrugerombudsmanden.dk/alle-emner/uanmodede-henvendelser/telefonsalg) · 00-beslutninger § 11 |
| e | Sælge på "AI Act-krav" | Forordning 2026/1744 ændrede art. 4 (i kraft 27. juli 2026). Virksomheder skal "tage tiltag, der understøtter udviklingen af AI-kompetencer". Der er **intet krav** om et bestemt niveau, certifikat eller test, og dokumentation anbefales, men er ikke et krav. Hvilken dansk myndighed der fører tilsyn, er uafklaret. | Budskabet er "dokumenteret, rollebaseret tiltag efter art. 4". Se tabellen nedenfor. | [EUR-Lex 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj) · [Kommissionens Q&A](https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers) |
| f | MobilePay som betaling | MobilePay via Stripe understøtter ikke tilbagevendende betalinger. | Abonnementer betales med **kort via Stripe**. | [Stripe MobilePay](https://docs.stripe.com/payments/mobilepay) |
| g | Lære folk de konkrete funktioner | Værktøjerne skifter hurtigt. Custom GPTs udfases fx 11. dec. 2026 og erstattes af Plugins/Skills, og Gems hos Google bliver til Skills. | Pensum bygges på **begreber**: egne assistenter, forbindelser til systemer, planlagte opgaver og agenter. Funktionsnavne er data, som indholdsmotoren holder ajour. | research-fund "Værktøjerne lige nu" |
| h | Almindeligt checkout | Siden 19. juni 2026 skal knappen **"Fortryd aftale"** være synlig i hele fortrydelsesperioden (§ 20 a). Prisen inkl. moms skal stå med fed over knappen, og knappen skal hedde "Køb" (§ 12). Opsigelse skal kunne ske på samme platform (§ 28 a). | B2C-checkout får en fed pris pr. md. inkl. moms og en "Køb"-knap. Kunden giver samtykke og erkender tab af fortrydelsesret ved straks-adgang. Kvittering sendes på mail, "Fortryd aftale" er synlig i 14 dage, og opsigelse sker i appen. **Advokaten afklarer**, om MindForward er "digitalt indhold" eller en "tjenesteydelse". | [Lov 723/2025](https://www.retsinformation.dk/eli/lta/2025/723) · [Forbrugeraftaleloven](https://www.retsinformation.dk/eli/lta/2025/1184) · [Oplysningskrav](https://www.forbrugerombudsmanden.dk/media/46756/oplysningskrav-ved-online-salg-af-abonnementer.pdf) |
| i | Færch & Co. som første kunde | Det er en oplagt pilot, fordi du allerede er AI-implementør der. Men du er ansat, så der kan være klausuler om bibeskæftigelse, immaterielle rettigheder og interessekonflikt. | **Læs din ansættelseskontrakt først.** Få ledelsens skriftlige accept af MindForward som sideprojekt og af en pilotaftale på almindelige vilkår. Hold MindForward-udvikling uden for arbejdstid og på eget udstyr. | Egen kontrakt (ikke i research) |

**AI-forordningen: tilladte og forbudte formuleringer**

| Brug | Brug aldrig |
|---|---|
| "Et dokumenteret, rollebaseret tiltag efter AI-forordningens art. 4" | "AI Act-certificering" / "certificeret efter AI Act" |
| "Art. 4 kræver tiltag, der understøtter AI-kompetencer. MindForward er sådan et tiltag." | "Lovkrav om certificering" |
| "Rapporten dokumenterer, hvad I har gjort, og hvem der har gennemført hvad" | "Påkrævet niveau" / "I skal bestå" |
| "Bruger jeres medarbejdere ChatGPT eller Copilot, er I omfattet af art. 4" | Bødetrusler: "Undgå bøder", "Risikér millionbøder" |

---

## 3. Produktet

**Koncept:** Medarbejderen lærer ved at løse rigtige arbejdsopgaver i en øvesandkasse. Flowet er: landingsside → vælg værktøj → opret bruger → 5-min niveautest → personlig modulplan → sandkasse.

**Spor (MVP):**

| Spor | Niveau | Bemærkning |
|---|---|---|
| ChatGPT | — | Stærkest i B2C og hos mindre firmaer |
| Copilot | `COPILOT_CHAT`: gratis med Microsoft 365 | Den store indgang. Alle M365-kunder har det allerede |
| Copilot | `COPILOT_M365`: betalt licens ($21–30/bruger/md) | Modulerne angiver hvilket niveau de kræver |
| Claude | — | Med fra launch. Forbindelser til bl.a. Microsoft 365 og Google |
| Gemini | Fase 2 | Spor er data, ikke kode |

**Sandkassen:** Den har egen UI og kører på en rigtig model via Anthropic API, mærket "Øvemodel". Den fiktive øvevirksomhed **Nordlys Logistik ApS** (40 ansatte, Aarhus) har indbakke, kalender, filer, kunde-CRM og økonomiark. Forbindelser og automationer øves mod disse data og aldrig mod rigtige data. Et PII-filter advarer om eller blokerer CPR-, kort- og kontonumre.

**Modultyper:** `CORE` (fast pensum) · `FEATURE` (én funktion) · `NEWS` (auto-genereret nyhed) · `ROLE` (salg, HR, økonomi, kundeservice, ledelse, drift).

**Trintyper:**

| Trin | Hvad brugeren gør |
|---|---|
| `READ` | Læser maks. 120 ord |
| `DEMO` | Ser en animeret gennemgang i sandkassen |
| `CLICK_TASK` | Udfører en handling i sandkassen (bestået når sandkassens event matcher) |
| `PROMPT_TASK` | Skriver en prompt, der bedømmes af faste checks og derefter en LLM-rubric (temperatur 0) |
| `QUIZ` | Svarer på multiple choice |
| `SPOT_ERROR` | Finder fejlen eller hallucinationen i et AI-svar |
| `JUDGMENT` | Svarer på "Må du gøre dette?" (GDPR, fortrolighed). Datasikkerhed er must-pass |

**Score:** Et modul er bestået ved **≥ 80 %**. Der er ubegrænsede forsøg, og det bedste forsøg tæller. Hjælpen har tre trin (nudge → konkret → vis løsning), og bruges trin 3, giver trinnet 0 point. Der udstedes et PDF-certifikat pr. bestået spor-niveau.

**Månedlig træning:** En auto-sammensat pakke med månedens nyheder til brugerens spor plus 1 genopfriskning. Den tager **≤ 15 min**. Påmindelser sendes dag 1, 14 og 25 som servicemails **uden tilbud**, og brugeren kan slå dem fra.

**Indholdsmotor:** Den læser officielle release notes dagligt og kører fetch → diff → classify (relevant for erhverv? tilgængelig i EU?) → draft med kilde pr. påstand → uafhængig verifikation → publiceringspolitik (se 2b). Microsoft Learn er CC BY 4.0, så kilden krediteres. Teksten skrives med egne ord og et link.

**Admin-dashboard:** Invitation via mail, link eller domæne. SSO med Microsoft Entra ID og Google. Admin ser status, score og certifikater. **Virksomhedsrapporten** (CSV og PDF) dokumenterer AI-kompetencerne og sælges som en selvstændig feature.

**Privacy by design:** Admins ser **ikke** medarbejdernes prompt-tekster, og prompt-tekster slettes efter 30 dage. Scores markedsføres som læring, ikke overvågning, fordi Datatilsynet i 2026 har fokus på arbejdsgiveres kontrol med medarbejdere. MindForward er databehandler for B2B-kunder, så hver kunde får en databehandleraftale.

---

## 4. Marked og konkurrenter

| Tal | Værdi | Kilde |
|---|---|---|
| Danske virksomheder med 10+ ansatte | 25.569 (~2,15 mio. årsværk) | [DST GF13 2024](https://www.statbank.dk/GF13) |
| Heraf med AI (estimat) | ~10.700 | DST GF13 |
| Virksomheder der bruger AI | 42 % (Danmark nr. 1 i EU) | Eurostat 2025, via [DI](https://www.danskindustri.dk/arkiv/analyser/2026/09/ai-virksomheder-har-oget-bade-vakst-og-beskaftigelse/) |
| Bruger AI kun ad hoc / systematisk | 45 % / 10 % | [DI sep. 2026](https://www.danskindustri.dk/arkiv/analyser/2026/09/ai-virksomheder-har-oget-bade-vakst-og-beskaftigelse/) |
| Største barriere | Manglende kompetencer (80 % blandt overvejende ikke-brugere) | DST |
| SMV'er der efterspørger opkvalificering | 33 % | [Erhvervsfremmebestyrelsen](https://erhvervsfremmebestyrelsen.dk/sites/default/files/2026-01/SMV%27er%20og%20kunstig%20intelligens.pdf) |

10.000 betalende brugere svarer til **0,47 %** af årsværkene i virksomheder med 10+ ansatte. Målet kræver altså ikke en stor markedsandel.

**Konkurrenter**

| Alternativ | Pris | Svaghed |
|---|---|---|
| Danske kurser (fremmøde) | 4.000–6.000 kr pr. person pr. dag | Dyrt, engangskursus, forældet efter få måneder |
| Dansk e-læring (GoLearn, SecureFirst) | — | Video og quiz, ingen øvelse |
| Leverandørernes akademier (OpenAI, Microsoft Copilot, Anthropic, Google) | Gratis | Ét værktøj hver, mest video, engelsk, måler kun gennemførelse |
| Section (internationalt) | $750/seat/år | Engelsk, ingen multi-værktøjs-sandkasse |
| Dansk sandkasse/simulering | — | **Findes ikke** |

**Fordelen**

- **Hands-on på dansk:** den eneste danske sandkasse med øvelse på tværs af værktøjer og på en realistisk dansk virksomhed.
- **Pris:** 588 kr ex. moms om året pr. bruger (490 kr ved årsbetaling) mod 4.000–6.000 kr for én kursusdag.
- **Altid opdateret:** indholdsmotoren og 15 minutter om måneden holder kompetencen ved lige, også når værktøjerne skifter.
- **Målbart og dokumenterbart:** score i stedet for gennemførelse, plus rapport til art. 4, uden at admin ser prompt-tekster.

---

## 5. Priser og økonomi

**Priser** (besluttet 12. okt. 2026. Hypoteser, der ligger i config/DB):

| | Månedlig | Årlig | Vilkår |
|---|---|---|---|
| B2B | 49 kr/bruger ex. moms | 490 kr/bruger | Min. 5 brugere, én samlet betaling pr. virksomhed. 14 dages prøve uden kort for op til 5 brugere |
| B2C | 49 kr inkl. moms | 490 kr | Niveautest og de første 3 moduler gratis |
| Senere | "Grundforløb" | — | Fast pakke (6 timer + certifikat) til kompetencefondenes positivlister |

### Antagelser i scenarierne

- 80 % af brugerne er B2B til 49 kr ex. moms med gennemsnitligt 20 brugere pr. virksomhed (én betaling pr. virksomhed). 20 % er B2C til 49 kr inkl. moms, altså 39,20 kr ex. moms.
- Alle betaler månedligt. Omsætningen er ex. moms.
- Stripe tager 1,5 % + 1,80 kr pr. betaling plus 0,7 % for Billing, uden Stripe Tax. Gebyret beregnes af det trukne beløb inkl. moms: 1.225 kr pr. B2B-virksomhed og 49 kr pr. B2C-bruger.
- AI koster 0,5–1,0 kr pr. bruger/md (estimat).
- Hosting og værktøjer koster 500–1.500 kr (100 brugere), 1.500–3.000 kr (1.000) og 3.000–8.000 kr (10.000) (estimat).
- Bogføring, revisor og forsikring koster 2.000–4.000 kr/md fast (estimat).
- Marketing er 5.000 kr/md ved 100 brugere og 20.000 kr/md (loftet) fra 1.000 brugere.
- **Ikke medregnet:** løn til Marco, advokat, varemærkeregistrering og andre engangsudgifter. Indhent tilbud på dem.
- Spændet går fra lave til høje omkostninger. Tallene er beregnet i Python og afrundet.

### Scenarier (kr)

| | 100 brugere | 1.000 brugere | 10.000 brugere |
|---|---:|---:|---:|
| B2B-virksomheder (à 20) / B2C-brugere | 4 / 20 | 40 / 200 | 400 / 2.000 |
| Omsætning B2B pr. md | 3.920 | 39.200 | 392.000 |
| Omsætning B2C pr. md | 784 | 7.840 | 78.400 |
| **Omsætning i alt pr. md** | **4.704** | **47.040** | **470.400** |
| Stripe | 173 | 1.726 | 17.256 |
| AI | 50–100 | 500–1.000 | 5.000–10.000 |
| Hosting/værktøjer | 500–1.500 | 1.500–3.000 | 3.000–8.000 |
| Bogføring/revisor/forsikring | 2.000–4.000 | 2.000–4.000 | 2.000–4.000 |
| Marketing | 5.000 | 20.000 | 20.000 |
| Omkostninger i alt pr. md | 7.723–10.773 | 25.726–29.726 | 47.256–59.256 |
| **Resultat før skat pr. md** | **−6.100 til −3.000** | **17.300–21.300** | **411.100–423.100** |
| Resultat før skat pr. år | −72.800 til −36.200 | 207.800–255.800 | 4,93–5,08 mio. |
| **Efter 22 % selskabsskat pr. år** | Underskud, ingen skat | **162.100–199.500** | **3,85–3,96 mio.** |

**Break-even**

- Hver betalende bruger giver i snit **~44,3–44,8 kr/md** i dækningsbidrag efter Stripe og AI. En B2B-bruger giver ~46,5 kr og en B2C-bruger ~35,5 kr.
- For at dække faste omkostninger plus 20.000 kr marketing kræves **~525–610 betalende brugere**. Det svarer til ca. 21–24 virksomheder à 20 brugere plus ~105–120 B2C.
- Med 5.000 kr marketing kræves ~170–240 brugere, og uden marketing ~56–124 brugere.

**Det skal du vide**

- **B2C på månedsbetaling er dyrt i gebyrer.** Stripe tager 2,88 kr pr. betaling, hvilket er 7,3 % af nettoomsætningen. For B2B er det 2,9 %. Skub B2C mod årsbetaling: 12,58 kr i gebyr pr. år mod 34,54 kr ved månedsbetaling.
- **Prisen er den største løftestang.** Hver 10 kr ekstra på B2B-prisen giver 80.000 kr/md mere ved 10.000 brugere. Prisen er en hypotese og kan testes, fx Claudes forslag om 99 kr for B2B.
- **Marketingloftet begrænser væksten.** Ved 10.000 brugere svarer 20.000 kr/md til 4 % af omsætningen, så væksten skal komme fra SEO, partnere og henvisninger. Loftet kan hæves bevidst i config, men ikke af automatikken.
- **Revision:** 10.000 brugere giver en omsætning på ~5,64 mio. kr/år, hvilket er under grænsen for revisionspligt på 8 mio. kr i omsætning. Det skal **bekræftes med revisor**, fordi der også er andre kriterier og koncernforhold under Esther Gruppen ApS. Bekræft også skattebehandlingen med revisor.

---

## 6. Marketingstrategi der kører af sig selv

### Positionering

**MindForward er den danske øvebane for AI på jobbet.** Medarbejderne lærer ChatGPT, Copilot og Claude ved at gøre det, ikke ved at se video, og I får dokumentationen med.

> One-liner: **"Få greb om AI — 15 minutters øvelse om måneden, på dansk, for 49 kr."**

### ICP (ideal kunde)

| Segment | Beslutningstager | Udløser |
|---|---|---|
| SMV 10–50 ansatte | Ejer/direktør | "Vi betaler for Microsoft 365, men ingen bruger Copilot rigtigt" |
| SMV 50–250 ansatte | HR/People, evt. IT | Art. 4, behov for dokumentation, ønske om onboarding i stor skala |
| B2C | Den enkelte medarbejder | Vil blive bedre og stå stærkere på arbejdsmarkedet |

### Funnel

1. **Gratis 5-min "AI-niveautest"** (forventet ~65 % gennemførelse, ~40 % afgiver kontakt; leverandørdata).
2. **Resultatside:** niveau, 3 konkrete næste skridt og en knap til at starte en prøveperiode eller de gratis moduler.
3. **Aktivt samtykke:** en checkbox, der *ikke* er sat på forhånd, hvor kunden siger ja til at modtage tips og tilbud fra MindForward på mail. Testresultatet må ikke afhænge af svaret. Derefter dobbelt opt-in.
4. **Nurture:** kun til dem med samtykke (se flow 5).
5. **Prøveperiode og køb:** B2B får 14 dage uden kort for op til 5 brugere (forventet 18–25 % konvertering til betalende). B2C køber direkte efter 3 gratis moduler.

### Motor 1: SEO fra indholdsmotoren (svinghjulet)

- Hvert verificeret `NEWS`-modul genererer automatisk en offentlig side, fx "Nyt i Copilot i oktober 2026" eller "Nyt i ChatGPT denne måned". Teksten skrives med egne ord, med link til kilden og "Automatisk opdateret [dato]".
- Hver side slutter med en opfordring til at tage niveautesten.
- **Svinghjulet:** release notes → produktmodul → SEO-side → test → lead → kunde → månedlig træning, så kunden bliver.
- Faste landingssider (skrevet én gang og godkendt af dig): "AI-kursus for medarbejdere", "Copilot-kursus", "Copilot Chat gratis — hvad kan den?", "AI-forordningen art. 4 for SMV'er" (med de tilladte formuleringer).
- Regel: hvis tilgængeligheden i EU er ukendt, står der "tjek tilgængelighed hos jer". Vi gætter aldrig.

### Motor 2: Betalte annoncer (hårdt loft 20.000 kr/md)

| Kanal | Ved launch (5.000 kr) | Fra ~1.000 brugere (20.000 kr) | Styring |
|---|---:|---:|---|
| Google Search (intent: "AI kursus medarbejdere", "Copilot kursus") | 3.000 | 8.000 | Automatisk via Google Ads API |
| Meta (niveautest til ejere af små firmaer, B2C, retargeting; CPC ~7 kr) | 2.000 | 5.000 | Automatisk via Meta Marketing API |
| LinkedIn (HR og direktører, 50–250 ansatte; estimat 30–45 kr/klik) | 0 | 5.000 | Manuelt, eller via API når adgang er godkendt |
| Test/reserve | 0 | 2.000 | Nye vinkler og kanaler |

**Budgetregler (automatiske)**

- **Loftet håndhæves i koden:** 20.000 kr/md samlet. Der kommer en alarm ved 80 %, og alle kampagner pauses ved 100 %.
- **Maks. CAC ud fra payback ≤ 6 måneder:** ~280 kr pr. B2B-bruger (~1.400 kr for en virksomhed med 5 brugere, ~5.600 kr for 20) og ~210 kr pr. B2C-kunde.
- **Mål-CPL = maks. CAC × (lead → betalende-rate).** Startværdien sættes ud fra benchmarks og erstattes af egne tal efter 4 uger.
- **Stop:** et annoncesæt pauses automatisk, når det har brugt 3 × mål-CPL uden lead, eller når CPL har været over 2 × mål i 7 dage.
- **Skalér:** når CPL har været under målet i 7 dage med mindst 10 leads, hæves budgettet med 20 %. Det sker højst hver 3. dag og altid inden for loftet.
- **Kanaltjek hver måned:** hvis CAC-payback er over 6 måneder to måneder i træk, lukkes kanalen.

### Motor 3: Marcos telefonsalg (de første 20 B2B-kunder)

Det er din hurtigste vej. Sæt 2 × 2 timer om ugen af de første 90 dage.

- **Åbning:** "Marco fra MindForward. Jeg ringer, fordi I kører Microsoft 365. Har du 30 sekunder?"
- **Diagnose:** "Bruger jeres folk ChatGPT eller Copilot systematisk, eller mest når nogen lige kommer i tanke om det?" (45 % gør det kun ad hoc.)
- **Kontrast:** En kursusdag koster 4.000–6.000 kr pr. person og er forældet efter et halvt år. MindForward koster 49 kr/md, er øvelse i stedet for video og tager 15 min om måneden.
- **Art. 4 uden frygt:** "Rapporten dokumenterer jeres tiltag efter art. 4." Ingen bødetale.
- **Tilbud:** 14 dages prøve uden kort for 5 brugere. Opret den sammen med kunden i telefonen, eller send linket, de beder om.
- **Luk og log:** Book 15 minutters opfølgning på dag 10 i prøveperioden. Oplys om frameldingsret ("sig til, så ringer jeg ikke igen"). Tjek Robinsonlisten ved enkeltpersoner og enkeltmandsvirksomheder.

### Motor 4: Partnere

| Partner | Hvorfor de gider | Tilbud |
|---|---|---|
| Revisorer og bogholderier | Deres SMV-kunder spørger til AI | Partnerlink med fx 15 % af første års betaling (hypotese) |
| IT- og Microsoft-partnere | De sælger M365/Copilot-licenser, og MindForward får kunderne til at bruge dem | Henvisningsprovision eller videresalg. MindForward som "adoption"-pakke |
| Brancheforeninger | Et medlemsgode | Reel medlemspris. Foreningen sender selv til sin liste efter sine egne samtykker |
| Kompetencefonde (fx HK) | Fonden betaler op til 3.500 kr pr. kursusdag | "Grundforløb" (6 timer + certifikat) på fondenes positivlister |

### Motor 5: Mailflows (kun med samtykke)

| Flow | Modtager | Indhold |
|---|---|---|
| Nurture (dag 0, 2, 5, 9) | Har givet samtykke via testen | Resultat + 3 øvelser → én opgave til i morgen → en Nordlys-case → prøve/køb |
| Månedligt nyhedsbrev | Har givet samtykke | "Nyt i ChatGPT/Copilot denne måned" fra indholdsmotoren |
| Prøveperiode (B2B) | Brugere i prøve | Servicemails: kom i gang, invitér kolleger, prøven udløber dag X. Faktuelt og **uden tilbud** |
| Kunder (§ 10 stk. 2) | Betalende, oplyst ved køb, nem framelding | Kun egne, tilsvarende produkter, fx årspris eller nyt spor |
| Win-back | Opsagte kunder med samtykke | Nye spor og nye funktioner. Reel rabat med slutdato |

### Motor 6: Henvisning, "Inviter en virksomhed"

- Admin eller bruger deler **sit eget** link. MindForward sender ikke mails til de adresser, de henviser til.
- Belønning: 1 gratis måned til begge virksomheder, når den henviste betaler første gang (5 brugere). Det er et fast program, ikke et tidsbegrænset tilbud.

### Automatiseret vs. Marco

| Opgave | Automatisk | Marco |
|---|---|---|
| NEWS-moduler og SEO-sider | Ja (efter verifikation) | Kill switch ved fejl |
| CORE/FEATURE/ROLE-moduler | Kladde og GitHub-issue | 1-klik-godkendelse |
| Niveautest, resultatside, samtykke, dobbelt opt-in | Ja | — |
| Nurture-, nyhedsbrevs- og servicemails | Ja | Godkender skabeloner én gang |
| Google- og Meta-annoncer: stop/skalér | Ja, inden for loftet | Ugentligt kig på dashboard |
| LinkedIn-annoncer | Nej (indtil API er godkendt) | Opsætter og justerer månedligt |
| Telefonsalg til de første 20 B2B-kunder | Nej | 2 × 2 t/uge i 90 dage |
| Partneraftaler | Partnerlinks og provisionsopgørelse | Indgår aftalerne |
| Support | AI-agent | Eskalationer |
| Faste landingssider og art. 4-tekster | Kladde fra Claude | Godkender, og advokaten læser art. 4-teksten |

### Forbudte taktikker

- Kolde marketingmails, **også B2B**.
- Mails til folk, der kun har taget testen, uden aktivt samtykke.
- LinkedIn-bots, automatiserede LinkedIn-beskeder og scraping.
- Falske rabatter: opdigtet førpris, tilbud længere end ~10 dage uden annonceret slutdato, nedtællere der nulstilles, "kun i dag".
- Tilbud eller upsell i påmindelses- eller servicemails.
- Frygt omkring AI Act: "certificering", "påkrævet niveau", bødetrusler.
- Uanmodede opkald til forbrugere.
- Leverandørernes logoer, skærmbilleder, "GPT" i navne eller antydning af samarbejde med OpenAI, Microsoft, Anthropic eller Google.

---

## 7. Drift uden ansatte

| Område | Løsning |
|---|---|
| Betaling | Stripe Checkout + Billing (pr. bruger) + Customer Portal på dansk. Kun kort. Webhooks er den eneste sandhed om abonnementsstatus. Momsen beregnes selv (ingen Stripe Tax i MVP). EU-salg håndteres, når det bliver nødvendigt (OSS over €10.000/år, omvendt betalingspligt ved EU-B2B). |
| Offentlige kunder (EAN) | Fase 2 via e-conomic API. Stripe-fakturaer er ikke e-fakturaer. |
| Support | In-app AI-agent: slår konto og plan op, sender link til kundeportalen, gensender faktura, nulstiller fremskridt og svarer ud fra hjælpecenteret. Den må aldrig refundere, give rabat, love noget juridisk eller udlevere andres data. Den eskalerer til indbakken, og du får en daglig digest. |
| Bogføring | e-conomic (registreret digitalt bogføringssystem) + Pairy (fra 149 kr/md) eller Integrationspartner (199 kr/md/modul) til Stripe-posteringer. Revisor ved årsafslutning. |
| Jura | Advokat gennemgår før launch: handelsbetingelser, fortrydelsesflow (digitalt indhold eller tjenesteydelse?), databehandleraftale (Datatilsynets [skabelon](https://www.datatilsynet.dk/regler-og-vejledning/blanketter-og-skabeloner)), privatlivspolitik, trade dress/sandkasse og art. 4-tekster. |
| Omkostningsvagt | Token-loft pr. bruger pr. dag, månedligt loft med alarm ved 80 % og forbrugsgrænse i Anthropic-konsollen fra dag 1. |

**Ugentlig rutine, 2 timer (efter launch)**

| Tid | Opgave |
|---|---|
| 20 min | 1-klik-godkendelse af moduler i `IN_REVIEW`. Stikprøve på et auto-publiceret NEWS-modul |
| 20 min | Eskalationer og support-digest. Opdatér hjælpecenteret, når samme spørgsmål kommer igen |
| 20 min | Marketing-dashboard: CPL, CAC, log over stop og skalering. LinkedIn-justering |
| 15 min | Økonomi: Stripe → e-conomic-afstemning, fejlede betalinger, AI-forbrug |
| 15 min | KPI'er: test → lead → prøve → betalende, aktivering, månedlig gennemførelse, churn |
| 30 min | Partner- og kundeopfølgning |

---

## 8. Plan: de første 90 dage

> Milestone-numre og acceptkriterier står i `docs/11-roadmap.md`, og det er den, der gælder. Ugerne nedenfor er et skøn. Designsessioner (flere visuelle versioner, én skærm ad gangen) ligger før M3, M4, M5 (offentlig testside) og M7 (admin-UI).

| Uge | Byg | Engangsopgaver og salg |
|---|---|---|
| 1 | M0: repo, CI og konti | **Tjek ansættelseskontrakten** (bibeskæftigelse/IP). Tjek domæne og varemærke for "MindForward". Opret konti (GitHub, Vercel, Neon, Anthropic, Stripe testmode, Resend, Inngest, PostHog EU, Sentry, e-conomic). Afgør selskabsstruktur under Esther Gruppen med revisor |
| 2 | M1: auth, organisationer, SSO (Entra ID, Google) | Indhent tilbud fra advokat. Begynd at bygge en ringeliste over SMV'er i Østjylland (kun telefon) |
| 3–4 | Moduler, scoring og første CORE-indhold. Designsession før M3 | Spørg Færch & Co.s ledelse om pilot, når kontrakten er afklaret |
| 5–6 | Sandkassen med Nordlys Logistik. Designsession før M4 | Advokat: handelsbetingelser, DPA og fortrydelsesflow |
| 7–8 | **M5: offentlig niveautest** + samtykke og dobbelt opt-in. SEO-landingssider | Gå live med testen. Annoncer for 5.000 kr/md. Begynd at samle samtykke-leads. Kontakt de første 5 partnere (revisorer og IT-partnere) |
| 9–10 | Betaling (Stripe, "Fortryd aftale", opsigelse i appen) og M7: admin-UI + rapport. Designsession før M7 | **Pilot hos Færch & Co.** Telefonsalg begynder: 2 × 2 t/uge |
| 11–12 | Indholdsmotor (NEWS auto-publicering, kill switch), supportagent, launch-gate | Advokatens slutgennemgang. Stripe i live mode |
| 13 | **Launch** | Konvertér prøveperioder. Første case fra piloten |

**Mål på dag 90** (mål, ikke prognose): 1 pilot i drift, 500 gennemførte tests, 150 samtykke-leads, 10 betalende B2B-virksomheder og de første 20 inden dag 120.

---

## 9. Risici

| # | Risiko | Afbødning |
|---|---|---|
| 1 | **For få kunder** under et loft på 20.000 kr/md | Telefonsalg til de første 20, partnere, SEO-svinghjulet. Test prisen (49 eller 99 kr B2B). Regler for stop og skalering |
| 2 | **Juridisk fejl** (trade dress, forbrugeraftaleloven, markedsføringsloven, hvor bøden kan være 4,25 mio. kr) | Advokatgennemgang og launch-gate. Samtykke-gate i koden. Ingen falske tilbud. Faste art. 4-formuleringer |
| 3 | **Indholdsmotoren tager fejl**, eller værktøjerne ændrer sig hurtigere end pensum | Kun NEWS publiceres automatisk, efter uafhængig verifikation. Kill switch og rollback. Pensum bygget på begreber |
| 4 | **Leverandørerne laver selv gratis hands-on-træning** | Dansk, flere værktøjer, Nordlys-cases, score og art. 4-rapport. Det får man ikke fra én leverandør |
| 5 | **Konflikt med ansættelsen hos Færch & Co.** (IP, bibeskæftigelse, tid) | Læs kontrakten nu. Skriftlig accept. Byg uden for arbejdstid. Pilot på almindelige vilkår |
| 6 | **Lav brug efter køb**, hvilket giver churn (virksomheden betaler, medarbejderne øver ikke) | 15 min om måneden, påmindelser dag 1/14/25, adminstatus og certifikater. Markedsfør det som læring, ikke kontrol |

---

## 10. Kilder

Alle er hentet fra `docs/research-fund.md` (verificeret 12. okt. 2026).

- Markedsføringsloven, LBK 1420/2024: https://www.retsinformation.dk/eli/lta/2024/1420
- Forbrugerombudsmanden, vejledning om spamforbuddet: https://forbrugerombudsmanden.dk/media/bjajzdv1/vejledning-om-spamforbuddet-2021-a.pdf
- Forbrugerombudsmanden, telefonsalg: https://forbrugerombudsmanden.dk/alle-emner/uanmodede-henvendelser/telefonsalg
- Forbrugerombudsmanden, retningslinjer for prismarkedsføring: https://forbrugerombudsmanden.dk/publikationer/retningslinjer-og-vejledninger/vejledninger-longreads/retningslinjer-for-prismarkedsfoering
- Forbrugeraftaleloven, LBK 1184/2025: https://www.retsinformation.dk/eli/lta/2025/1184
- Lov 723/2025 (fortrydelsesknap, § 20 a): https://www.retsinformation.dk/eli/lta/2025/723
- Oplysningskrav ved online salg af abonnementer: https://www.forbrugerombudsmanden.dk/media/46756/oplysningskrav-ved-online-salg-af-abonnementer.pdf
- Forordning (EU) 2026/1744: https://eur-lex.europa.eu/eli/reg/2026/1744/oj
- EU-Kommissionen, AI literacy Q&A: https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers
- Datatilsynet, blanketter og skabeloner: https://www.datatilsynet.dk/regler-og-vejledning/blanketter-og-skabeloner
- Microsoft, varemærker: https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks
- OpenAI, brand: https://openai.com/brand/
- Anthropic, trademark guidelines: https://www.anthropic.com/legal/trademark-guidelines
- Google, trademark guidelines: https://partnermarketinghub.withgoogle.com/brands/google/trademarks-and-terms/trademark-guidelines-for-proper-usage/
- Stripe, per-seat pricing: https://docs.stripe.com/subscriptions/pricing-models/per-seat-pricing
- Stripe, MobilePay: https://docs.stripe.com/payments/mobilepay
- Stripe, priser DK: https://stripe.com/dk/pricing
- Danmarks Statistik, GF13: https://www.statbank.dk/GF13
- DI, AI-analyse sep. 2026: https://www.danskindustri.dk/arkiv/analyser/2026/09/ai-virksomheder-har-oget-bade-vakst-og-beskaftigelse/
- Erhvervsfremmebestyrelsen, SMV'er og kunstig intelligens: https://erhvervsfremmebestyrelsen.dk/sites/default/files/2026-01/SMV%27er%20og%20kunstig%20intelligens.pdf
