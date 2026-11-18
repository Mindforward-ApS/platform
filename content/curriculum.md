# MindForward — Pensum (v1, begrebsbaseret)

> Kanonisk: `docs/00-beslutninger.md` § 2 + § 10. Modulformat og scoring: `docs/05-moduler-og-scoring.md`. Fuldt eksempel: `content/modules/core-prompt-01.json`.
> **Pensum lærer begreber, ikke knapper.** Begreberne er: *egne assistenter*, *forbindelser til systemer*, *planlagte opgaver*, *agenter* (+ prompting, filer og data, sikkerhed). Værktøjernes funktionsnavne (fx Custom GPTs → Skills/Plugins, Agent Builder, Gems, Notebooks) er **data** fra indholdsmotoren via `content/features/registry.json` og modulernes `featureRefs` (docs/06 § 12) — de skrives aldrig fast ind i CORE-tekst. Skin-terminologi i sandkassen kommer fra docs/04.
> Al øvelse sker mod den fiktive **Nordlys Logistik ApS** (40 ansatte, Aarhus) — `content/sandbox-world/`.

## Notation
- **Type:** `CORE` (alle spor, fast pensum) · `FEATURE` (begreb/funktion pr. spor; kan have spor-specifik variant) · `ROLE`. `CASE`/`EXAM` = `format`, bruges kun i Grundforløbet.
- **Spor:** `ALLE` = `CHATGPT`, `COPILOT`, `CLAUDE`, `GEMINI` (MVP: CHATGPT + COPILOT + CLAUDE). **Claude:** plan-krav (fx betalt plan for forbindelser eller agenter) vises som mærkat fra indholdsmotoren; Claude-modeller inde i Copilot er slået fra som standard i EU og nævnes i Copilot-modulerne om agenter/research. **Copilot:** `CHAT` = virker med `COPILOT_CHAT` (gratis med M365) · `M365` = kræver `COPILOT_M365` (betalt licens) · `–` = ikke relevant/ikke tilbudt i Copilot-sporet. Gemmes i `requiresTier`.
- **Trin:** R=READ, D=DEMO, C=CLICK_TASK, P=PROMPT_TASK, Q=QUIZ, S=SPOT_ERROR, J=JUDGMENT. `J!` = must-pass (DATA_SECURITY/GDPR).
- **Bestået:** altid ≥ 80 % + alle must-pass (docs/05 § 5–6). Under "Bestå" står kun det modulspecifikke (required rubric-kriterier m.m.).
- **Verif.:** `kræver_verifikation: true` (= `requiresVerification`) betyder: indholdet afhænger af leverandør-specifik adfærd → skal have `sources` og genverificeres af indholdsmotoren; tekst om konkret funktion hentes via `featureRefs`.
- **Begreb:** `concepts`-værdi (samme enum som classify i docs/06).

---

## De fem indgange (beslutning § 10c)

| Indgang | Hvad det er | Moduler |
|---|---|---|
| **Fundamental AI** (`area: AI_FUNDAMENTALS`) | Fælles for alle — **anbefalet, ikke påkrævet**; ligger først i planen | `core-ai-01`, `core-ai-02`, `core-llm-01`, `core-ai-03` (≈ 28 min) |
| **AI Act og ansvarlig brug** (`area: RESPONSIBLE_AI`) | Fælles for alle | `core-data-01`, `core-policy-01`, `core-aiact-01`, `core-aiact-02` (Niveau 1) · `core-image-01` (Niveau 2) |
| **ChatGPT** · **Microsoft 365 Copilot** · **Claude** (`area: TOOL_SKILLS`) | Spor (`Track`) med sandkasse-skin; brugeren vælger sit værktøj | Øvrige CORE-, FEATURE- og ROLE-moduler |

- Fundamental AI og AI Act er **områder**, ikke spor: det er `CORE`-moduler for alle spor, og de er værktøjsneutrale (ingen `CLICK_TASK`; kan tages på mobil).
- **Fundamental AI er en anbefaling:** modulerne mærkes "Anbefalet" (eller "Anbefalet til dig", når niveautesten viser usikkerhed om model-forståelse), kan springes over og tæller ikke med i kravene til niveau-certifikat. Gennemførte moduler vises på brugerens plan og i virksomhedsrapporten.
- "AI Act" er navnet på emnet. Der findes intet "AI Act-certifikat" — certifikater er fortsat pr. spor + niveau.
- Alle brugere får "Derfor er det relevant for dig" og en tilpasset skabelon ud fra niveau, jobrolle og værktøj — og mere præcist, når kontekstbiblioteket er udfyldt (docs/05 § 10.7). Modulernes indhold, spørgsmål og bedømmelse er ens for alle.

---

## Niveau 1 — Grundlag (sikker hverdagsbrug)

### Fundamental AI

**core-ai-01 · Hvad er AI — og hvad er det ikke?** · CORE · ALLE · CHAT · 7 min · Begreb OTHER · Verif. false · Område AI_FUNDAMENTALS · **Anbefalet**
- Mål: Forklar forskellen på AI, maskinlæring og generativ AI med hverdagseksempler · Genkend AI, du allerede bruger (stavekontrol, anbefalinger, ruteplan, spamfilter) · Skeln mellem hvad AI er god til (mønstre, sprog, udkast) og dårlig til (fakta uden kilde, ansvar, dømmekraft).
- Trin: R → Q (sortér 6 eksempler: AI / ikke AI; multi) → R → Q → S (reklametekst om et "AI-værktøj der forstår alt" — find overdrivelserne) → Q
- Bestå: alm. Kan tages på mobil.

**core-ai-02 · Hvor kommer AI fra?** · CORE · ALLE · CHAT · 6 min · OTHER · false · AI_FUNDAMENTALS · **Anbefalet**
- Mål: Placér milepælene på en tidslinje: 1950 (Alan Turing spørger, om maskiner kan tænke), 1956 (navnet "kunstig intelligens" bruges første gang, Dartmouth-konferencen), 1997 (en skakcomputer slår verdensmesteren), 2012 (gennembrud for dyb læring), 2017 (transformer-arkitekturen bag nutidens sprogmodeller), 2022 (ChatGPT gør sprogmodeller til hvermandseje) · Forklar hvorfor det er gået hurtigt de seneste år (data, regnekraft, ny arkitektur) · Forstå at forventninger og virkelighed ikke altid følges ad ("AI-vintre").
- Trin: R → Q (sæt milepæle i rækkefølge) → R → Q → Q
- Bestå: alm. **Faktatjek:** hvert årstal og navn skal have en kilde i `sources`, før modulet publiceres. Kan tages på mobil.

**core-ai-03 · Hvorfor er AI vigtigt for dig og dit arbejde?** · CORE · ALLE · CHAT · 7 min · OTHER · false · AI_FUNDAMENTALS · **Anbefalet**
- Mål: Nævn 3 typer opgaver i dit eget arbejde, hvor AI kan hjælpe, og 1 hvor den ikke skal bruges · Forklar hvorfor mennesket stadig har ansvaret for resultatet · Sæt et realistisk mål for din egen brug den kommende uge.
- Trin: R → Q → J (RESPONSIBLE_USE: en kollega sender et AI-svar videre til en kunde uden at læse det) → Q → R (afslutning: vælg én opgave, du vil prøve AI på i denne uge)
- Bestå: alm. `takeaway`: "Kortlæg tre opgaver, du bruger meget tid på". Ingen tal om produktivitet uden kilde. Kan tages på mobil.

### Øvrige Niveau 1-moduler (AI Act og ansvarlig brug + værktøjet)

**core-llm-01 · Hvad en sprogmodel er — og ikke er** · CORE · ALLE · Copilot CHAT · 8 min · Begreb PROMPTING · Verif. false · Område AI_FUNDAMENTALS · **Anbefalet** (tages efter `core-ai-02`)
- Mål: Forklar med egne ord at modellen forudsiger tekst og ikke slår op i en database · Genkend 4 typiske svagheder (opfinder, regner forkert, forældet viden, overbevisende tone) · Skeln mellem "chat med model" og "chat med adgang til web/filer".
- Trin: R → D (samme spørgsmål to gange → to forskellige svar) → C (stil et spørgsmål og "Prøv igen") → Q → S (svar med forældet info) → Q
- Bestå: S skal finde mindst 1 af 2 fejl.

**core-prompt-01 · Din første gode prompt** · CORE · ALLE · Copilot CHAT · 10 min · PROMPTING, SECURITY_PRIVACY · Verif. false
- Mål: Skriv en prompt med opgave, kontekst, målgruppe, format og begrænsninger · Kontrollér et AI-svar mod fakta · Vurdér hvad du må indsætte.
- Trin: R → C → R → Q → P → S → J! → Q (se `content/modules/core-prompt-01.json`)
- Bestå: P required-kriterier `opgave` + `kontekst`.

**core-prompt-02 · Fra første svar til godt svar** · CORE · ALLE · CHAT · 8 min · PROMPTING · false
- Mål: Forbedr et svar med opfølgende instrukser i stedet for at starte forfra · Bed om alternativer, kortere/længere og anden tone · Ved hvornår en ny samtale er bedre end en lang.
- Trin: R → C (send opfølgning i samme samtale) → P (forbedr AI'ens tilbudsmail til kunde med 2 opfølgninger) → Q → Q
- Bestå: P required `konkret-aendring` (opfølgningen siger præcist hvad der skal ændres).

**core-fact-01 · Hallucinationer og faktatjek** · CORE · ALLE · CHAT · 10 min · PROMPTING · false
- Mål: Find opfundne tal, kilder og løfter i et AI-svar · Brug 3 tjek-vaner (kilde, tal, "hvad ved du ikke?") · Bed AI'en markere usikkerhed.
- Trin: R → S (opfundet lovhenvisning + forkert sum i fragtberegning) → P (bed om svar med kildeangivelse og markering af usikkerhed) → S (opsummering af kontrakt med 3 fejl) → Q
- Bestå: begge S med alle fejl fundet ved første eller andet forsøg (alm. regel); P required `usikkerhed`.

**core-data-01 · Hvad må jeg indsætte? Datasikkerhed og GDPR** · CORE · ALLE · CHAT · 10 min · SECURITY_PRIVACY · false
- Mål: Sortér oplysninger i grøn/gul/rød (offentligt, internt, persondata/følsomt/fortroligt) · Anonymisér en tekst før brug · Vælg godkendt værktøj frem for privat app.
- Trin: R → Q (sortér 6 eksempler; multi) → P (omskriv en kundemail så den kan bruges uden persondata) → J! (CPR i lønsag) → J! (kundeliste i privat app) → J (fortroligt tilbud til konkurrent-analyse; CONFIDENTIALITY)
- Bestå: P har `NO_PII` BLOCK + required `personoplysninger-fjernet`. Sandkassens PII-filter demonstreres (docs/04).

**core-policy-01 · Virksomhedens AI-politik i praksis** · CORE · ALLE · CHAT · 7 min · SECURITY_PRIVACY · false
- Mål: Find svar på "må jeg?" i en AI-politik · Ved hvem man spørger ved tvivl · Forstå hvorfor politikken findes (ansvar, data, kvalitet).
- Trin: R (Nordlys' AI-politik, 1 side i filerne) → C (find afsnittet om godkendte værktøjer) → J (AI_POLICY: AI-tekst sendt uden gennemlæsning) → J (AI_POLICY: AI-genereret billede i markedsføring) → Q
- Bestå: alm. Hvis organisationen har angivet link til egen AI-politik (V5 i docs/01-produkt.md), vises det på resultatskærmen.

**core-mail-01 · Mails og korte tekster** · CORE · ALLE · CHAT · 8 min · PROMPTING · false
- Mål: Få et udkast i rigtig tone på første forsøg · Brug AI til at gøre egen tekst kortere/klarere · Tjek altid navne, datoer og løfter.
- Trin: R → C (vedhæft mail fra indbakken) → P (svar på reklamation; tone + max-længde) → P (omskriv egen rodet intern mail til 5 linjer) → S → Q
- Bestå: P1 required `opgave`, `tone`; P2 required `format`.

**core-meeting-01 · Mødenoter og opsummeringer** · CORE · ALLE · CHAT · 8 min · FILES_AND_DATA · false
- Mål: Lav beslutnings- og opgaveliste fra rå noter · Kræv ansvarlig + frist pr. opgave · Fang opsummeringer, der tillægger folk ting de ikke sagde.
- Trin: R → C (vedhæft driftsmødenoter fra filer) → P (opsummering: beslutninger, opgaver m. ansvarlig/frist, åbne spørgsmål) → S (opsummering der opfinder en beslutning) → J (RESPONSIBLE_USE: optagelse af møde uden at deltagere ved det) → Q
- Bestå: P required `struktur`, `ansvarlig-frist`.

**core-aiact-01 · Ansvarlig brug og AI-forordningen** · CORE · ALLE · CHAT · 7 min · SECURITY_PRIVACY · false
- Mål: Forklar kort hvad art. 4 handler om (virksomheder skal understøtte AI-kompetencer hos medarbejdere) · Genkend anvendelser hvor et menneske altid skal træffe beslutningen, og at AI-svar kan være skæve (bias) · Mærk AI-indhold når det er relevant.
- Trin: R → Q → J (RESPONSIBLE_USE: AI vurderer ansøgere) → J (RESPONSIBLE_USE: AI-svar til kunde om forsikringsdækning uden kontrol) → Q
- Bestå: alm. **Sprogregel:** aldrig "certificeringskrav", "påkrævet niveau" eller bøder (beslutning § 10). Juridisk gennemgang af teksten før publicering (docs/10).

**core-aiact-02 · AI-forordningen: roller og risikoniveauer** · CORE · ALLE · CHAT · 8 min · SECURITY_PRIVACY · false · Område RESPONSIBLE_AI
- Mål: Forklar forskellen på at udbyde et AI-system og at bruge det i sit arbejde (de fleste virksomheder er brugere/idriftsættere) · Genkend de fire risikoniveauer med et eksempel på hvert (forbudt, høj risiko, krav om gennemsigtighed, minimal risiko) · Ved hvornår du skal spørge den ansvarlige, før et nyt AI-værktøj tages i brug.
- Trin: R → Q → J (RESPONSIBLE_USE: nyt gratis AI-værktøj til CV-screening) → J (AI_POLICY: chatbot til kunder uden at oplyse, at det er AI) → Q
- Bestå: alm. Samme **sprogregel** som `core-aiact-01`. Juridisk gennemgang af teksten før publicering (docs/10). Kan tages på mobil.

**feat-orient-01 · Rundt i dit AI-værktøj** · FEATURE · ALLE (skin pr. spor) · CHAT · 6 min · OTHER · **Verif. true**
- Mål: Find ny samtale, historik, vedhæft fil og indstillinger · Slå historik/hukommelse fra/til hvor det findes · Find hvor værktøjet viser, om det søger på nettet.
- Trin: R → D → C (ny samtale) → C (vedhæft fil) → C (åbn indstillinger for data/hukommelse) → Q
- Bestå: alle tre C bestået. Spor-tekst ("hvad hedder det hos jer") fra `featureRefs`.

**feat-copilot-chat-01 · Copilot Chat: web, arbejde og licens** · FEATURE · COPILOT · CHAT · 7 min · SECURITY_PRIVACY · **Verif. true**
- Mål: Skeln mellem gratis Copilot Chat og betalt Microsoft 365 Copilot · Forstå hvornår svaret bygger på nettet vs. virksomhedens data · Ved hvordan man ser, om man er logget ind med arbejdskonto (beskyttet arbejdstilstand).
- Trin: R → D → C (skift mellem web/arbejde-faneblad i skin) → Q → J! (DATA_SECURITY: kundedata i Copilot med privat Microsoft-konto)
- Bestå: alm.

> **Grundmodul (art. 4), beslutning § 10b + § 10c:** `core-fact-01`, `core-data-01`, `core-policy-01`, `core-aiact-01` (≈ 34 min; Fundamental AI er anbefalet ved siden af) er grundmodulet for alle medarbejdere og vises samlet i virksomhedsrapporten med dato. Ophavsret dækkes af `core-image-01`. Har virksomheden et kontekstbibliotek, viser `core-policy-01` og `core-data-01` "Hos jer gælder: …" (docs/01 § 4.6).
> **`takeaway`:** alle CORE- og ROLE-moduler får en skabelon til eget job, navngivet efter arbejdsopgaven (docs/05 § 10.1).

> **Gratis for B2C:** niveautest + de første 3 moduler i den personlige plan (docs/07 § 7). Plan-generatoren placerer `core-ai-01`, `core-prompt-01`, `core-data-01` først (forslag efter § 10c — før: `core-llm-01` i stedet for `core-ai-01`; se `docs/OPEN-QUESTIONS.md`), medmindre testen markerer dem "kan springes over".

## Niveau 2 — Øvet (AI som fast arbejdsredskab)

**core-files-01 · Arbejd med filer og dokumenter** · CORE · ALLE · CHAT · 10 min · FILES_AND_DATA · false
- Mål: Stil præcise spørgsmål til et langt dokument · Bed om sidehenvisninger/citater og tjek dem · Sammenlign to versioner af en kontrakt.
- Trin: R → C (vedhæft 2 filer) → P (find ændringer mellem kontrakt v1 og v2 som tabel) → S (citat der ikke står i dokumentet) → J (CONFIDENTIALITY: kundekontrakt i ikke-godkendt værktøj) → Q
- Bestå: P required `afgraensning`, `format`.

**core-sheet-01 · Regneark og dataanalyse** · CORE · ALLE · CHAT · 12 min · FILES_AND_DATA · false
- Mål: Få AI til at analysere et regneark og vise sin fremgangsmåde · Kontrollér et beregnet tal med en stikprøve · Bed om en formel i stedet for et tal.
- Trin: R → C (vedhæft økonomi-regneark) → P (hvilke 3 kunder har størst fragtomkostning pr. palle — vis beregning) → S (forkert gennemsnit + forkert periode) → P (bed om Excel-formel til samme beregning) → Q
- Bestå: P1 required `fremgangsmaade`.

**core-report-01 · Rapporter og længere tekster** · CORE · ALLE · CHAT · 10 min · PROMPTING · false
- Mål: Byg en rapport i trin (disposition → afsnit → redigering) · Giv AI'en dine egne pointer i stedet for at lade den finde på dem · Tjek for udfyldningstekst og opfundne tal.
- Trin: R → P (disposition til kvartalsnotat ud fra 5 nøgletal) → P (skriv afsnit 2 med dine 3 pointer) → S → Q
- Bestå: P1 required `input-data`; P2 required `egne-pointer`.

**core-prompt-03 · Genbrugelige prompts og skabeloner** · CORE · ALLE · CHAT · 8 min · PROMPTING · false
- Mål: Omdan en god prompt til en skabelon med [pladsholdere] · Del skabeloner med kolleger uden fortrolige data · Vedligehold et lille prompt-bibliotek.
- Trin: R → P (lav skabelon til ugentlig kundestatus) → Q → J (CONFIDENTIALITY: skabelon med konkret kundepris deles i fællesmappe) → Q
- Bestå: P required `pladsholdere`, `ingen-konkrete-data`.

**feat-workspace-01 · Arbejdsrum, projekter og hukommelse** · FEATURE · ALLE · CHAT · 9 min · ASSISTANTS · **Verif. true**
- Mål: Saml filer og faste instrukser ét sted for en tilbagevendende opgave · Forstå hvad værktøjet husker mellem samtaler — og hvordan man slår det fra/sletter · Vælg hvad der ikke hører hjemme i hukommelsen.
- Trin: R → D → C (opret arbejdsrum "Kundeservice Nordlys" + tilføj fil + fast instruks) → C (se/slet en gemt hukommelse) → J! (DATA_SECURITY: kollegaens helbredsoplysning gemt i hukommelse) → Q
- Bestå: alm.

**feat-research-01 · Research-funktioner og kildekritik** · FEATURE · ALLE · CHAT · 10 min · OTHER · **Verif. true**
- Mål: Ved hvornår dyb research er det rigtige valg (og hvornår en almindelig søgning er nok) · Vurdér kilderne i en research-rapport · Formulér et afgrænset research-spørgsmål.
- Trin: R → P (research-opgave: el-lastbiler til 40-tons kørsel i DK — afgrænsning, kildetyper, format) → S (rapport med død kilde + tal uden kilde) → Q
- Bestå: P required `afgraensning`. Sandkassen viser en forberedt research-rapport (ingen live websøgning).

**core-image-01 · Billeder og ophavsret** · CORE · ALLE · CHAT · 8 min · OTHER · false
- Mål: Skriv en billedprompt til internt brug · Ved hvornår AI-billeder ikke må bruges (personer, varemærker, "i stil med" levende kunstnere, vildledning) · Mærk AI-genereret indhold.
- Trin: R → P (billede til intern nyhedsmail om ny terminal) → J (COPYRIGHT: konkurrents logo i AI-billede) → J (COPYRIGHT: foto af kunde redigeret uden samtykke) → Q
- Bestå: alm. Sandkassen viser forudgenererede billeder (ingen billedgenerering i MVP).

**feat-assist-01 · Egne assistenter** · FEATURE · ALLE · CHAT (Copilot: oprettelse kan kræve licens → verificeres) · 12 min · ASSISTANTS · **Verif. true**
- Mål: Beskriv en assistent med formål, instrukser, viden og grænser · Test assistenten med 3 realistiske og 1 "drilsk" spørgsmål · Beslut hvem den må deles med.
- Trin: R → D → C (opret assistent "Fragtguide" med instruks + fil) → P (skriv assistentens instruks: rolle, tone, kilder, hvad den skal afvise) → C (test med drilsk spørgsmål) → J (CONFIDENTIALITY: dele assistent med lønfil eksternt) → Q
- Bestå: P required `graenser`, `kilder`. Funktionsnavn pr. spor via `featureRefs` (udfasning af Custom GPTs 11. dec 2026 håndteres af registry).

**feat-copilot-m365-01 · Copilot i Office-apps og arbejdsdata** · FEATURE · COPILOT · **M365** · 12 min · FILES_AND_DATA · **Verif. true**
- Mål: Brug AI direkte i dokument, regneark, mail og møde · Forstå at svar kan bygge på alt, du har adgang til i virksomheden · Opdag oversharing (filer du ikke burde kunne se).
- Trin: R → D → C (opsummér mailtråd i indbakke-skin) → P (udkast i dokument-skin ud fra 2 filer) → J! (DATA_SECURITY: AI-svar viser lønoplysninger fra forkert delt mappe) → Q
- Bestå: alm. Vises for brugere med `COPILOT_CHAT` som "Til jer med licens".

## Niveau 3 — Avanceret (AI der arbejder for dig)

**feat-connect-01 · Forbindelser til systemer** · FEATURE · ALLE · M365 (Copilot) · 12 min · CONNECTORS · **Verif. true**
- Mål: Forklar hvad det betyder at give AI adgang til mail, kalender, filer og CRM · Giv mindst mulig adgang (læse vs. skrive, hvilke mapper) · Kontrollér hvad AI'en gjorde i et system.
- Trin: R → D → C (forbind øve-assistent til Nordlys' kalender med kun læseadgang) → P (find ledig tid til kundemøde og lav udkast til invitation — send ikke) → C (gennemgå aktivitetslog) → J! (DATA_SECURITY: give AI skriveadgang til hele CRM for at "spare tid") → Q
- Bestå: C1 assertion kræver `permission = read`. **Kun mod Nordlys' fiktive indbakke/kalender/filer/CRM — aldrig rigtige konti** (beslutning § 1).

**feat-sched-01 · Planlagte opgaver og automationer** · FEATURE · ALLE · M365 (Copilot) · 12 min · SCHEDULED_TASKS · **Verif. true**
- Mål: Omsæt en gentagen opgave til en planlagt opgave (hvad, hvornår, hvilke data, hvor havner resultatet) · Byg et menneskeligt tjek ind før noget sendes · Stop og ret en automation.
- Trin: R → D → C (opret planlagt opgave: mandag 07:00 statusoversigt over forsinkede ordrer → kun til mig) → P (instruks til opgaven inkl. hvad den skal gøre, hvis data mangler) → C (sæt på pause) → J (RESPONSIBLE_USE: automatisk afvisning af kundeklager uden menneske) → Q
- Bestå: C1 assertion kræver modtager = brugeren selv.

**feat-agent-01 · Agenter — og hvornår du ikke skal bruge dem** · FEATURE · ALLE · M365 (Copilot) · 12 min · AGENTS · **Verif. true**
- Mål: Forklar forskellen på chat, assistent, automation og agent · Vurdér om en opgave egner sig til en agent (flere trin, lav risiko, kan kontrolleres) · Sæt grænser og godkendelsespunkter.
- Trin: R → D (agent planlægger rute-ændring i trin) → Q (sortér 5 opgaver: agent / ikke agent) → C (godkend/afvis agentens foreslåede handlinger) → S (agentlog hvor agenten sendte mail uden godkendelse) → J (RESPONSIBLE_USE: agent med betalingsadgang) → Q
- Bestå: C kræver at den risikable handling (send mail til kunde) afvises.

**core-quality-01 · Kvalitetssikring af AI-arbejde** · CORE · ALLE · CHAT · 10 min · PROMPTING · false
- Mål: Brug en tjekliste før AI-indhold forlader dig · Få AI til at kritisere sit eget udkast mod kriterier · Dokumentér hvornår AI er brugt i et arbejdsprodukt.
- Trin: R → P (bed AI om at gennemgå et tilbud mod 4 kriterier) → S → J (RESPONSIBLE_USE: kunde spørger om svar er AI-skrevet) → Q
- Bestå: P required `kriterier`.

**core-workflow-01 · Design din egen AI-arbejdsgang** · CORE · ALLE · CHAT · 12 min · OTHER · false
- Mål: Kortlæg en af dine egne gentagne opgaver i trin · Vælg det rette greb pr. trin (prompt, skabelon, assistent, forbindelse, planlagt opgave, agent, ingen AI) · Angiv risiko og kontrolpunkt.
- Trin: R → Q (match greb til trin i Nordlys-eksempel) → P (beskriv egen arbejdsgang — **uden** person- eller kundedata; NO_PII BLOCK) → Q
- Bestå: P required `trin`, `kontrolpunkt`. Prompt-tekst følger 30-dages sletning; brugeren kan selv downloade den før.

## Rollespor (Niveau 2, `ROLE`, alle spor, Copilot CHAT medmindre andet står)

**role-sales-01 · Salg: forbered og følg op** · SALES · 10 min · CONNECTORS · false
- Mål: Forbered et kundemøde ud fra CRM-noter og ordrehistorik · Skriv opfølgning med næste skridt · Undgå at love priser/rabatter AI'en har fundet på.
- Trin: R → C (vedhæft CRM-kort for Hansen Byg) → P (mødeforberedelse: 3 spørgsmål, risici, mål) → S (opfølgningsmail med opfundet rabat) → J (CONFIDENTIALITY: konkurrents tilbud indsat) → Q
- Bestå: P required `maal`, `kundedata-brugt`.

**role-hr-01 · HR: tekster ja — vurdering af mennesker nej** · HR · 10 min · SECURITY_PRIVACY · false
- Mål: Skriv jobopslag og onboardingplan med AI · Fjern skævt/ekskluderende sprog · Ved at AI til udvælgelse/vurdering af ansøgere og medarbejdere er en højrisiko-anvendelse og ikke hører hjemme i et almindeligt chatværktøj.
- Trin: R → P (jobopslag for lagermedarbejder, inkluderende sprog) → S (opslag med aldersdiskriminerende formulering) → J! (GDPR: indsæt 30 ansøgninger og bed om rangering) → J! (GDPR: sygefraværsdata i prompt) → Q
- Bestå: alm. Juridisk gennemgang før publicering (docs/10).

**role-finance-01 · Økonomi: tal, afvigelser og forklaringer** · FINANCE · 12 min · FILES_AND_DATA · false
- Mål: Find og forklar budgetafvigelser ud fra et regneark · Lad AI vise beregninger, så de kan efterprøves · Skriv en forklaring til ledelsen i almindeligt sprog.
- Trin: R → C (vedhæft budget vs. realiseret) → P (top-3 afvigelser med beregning) → S (forkert fortegn + forkert måned) → P (forklaring til direktør, maks 100 ord) → J! (DATA_SECURITY: lønfil med CPR i ikke-godkendt værktøj) → Q
- Bestå: P1 required `beregning-vist`.

**role-cs-01 · Kundeservice: hurtige svar, rigtig tone, rigtig eskalering** · CUSTOMER_SERVICE · 10 min · PROMPTING · false
- Mål: Svar på klager med empati og fakta · Brug en fast skabelon/assistent til typiske spørgsmål · Ved hvornår en sag skal til et menneske.
- Trin: R → P (svar på skadet gods; uden at love erstatning) → S (svar der lover erstatning + forkert frist) → Q (5 henvendelser: AI-udkast / eskalér) → J (RESPONSIBLE_USE: kunde truer med advokat) → Q
- Bestå: P required `ingen-loefter`.

**role-lead-01 · Ledelse: rammer, beslutninger og forandring** · LEADERSHIP · 12 min · SECURITY_PRIVACY · false
- Mål: Skriv beslutningsoplæg med fordele/ulemper og ukendte faktorer · Formulér 5 regler til en AI-politik · Planlæg hvordan teamet lærer AI uden at det føles som overvågning.
- Trin: R → P (beslutningsoplæg: el-lastbil-pilot) → P (udkast til 5 AI-politikregler for Nordlys) → J (RESPONSIBLE_USE: bruge AI-scores til lønforhandling) → Q
- Bestå: P1 required `ukendte-faktorer`; P2 required `godkendte-vaerktoejer`, `data-regel`.

**role-ops-01 · Drift og håndværk: tilbud, arbejdssedler og tjeklister** · OPERATIONS · 8 min · FILES_AND_DATA · false
- Mål: Lav tjekliste/arbejdsseddel fra en kort beskrivelse (også på mobil) · Få AI til at gøre et tilbud forståeligt for kunden · Tjek mål, mængder og priser.
- Trin: R → P (tjekliste til daglig kontrol af lastbil) → S (tilbud med forkert mængdeberegning) → J (CONFIDENTIALITY: foto af kundens alarmkode) → Q
- Bestå: alm. **Ingen C/D → kan gennemføres helt på mobil.**

---

## Grundforløb (fast pakke til kompetencefonde)

**Formål:** et afgrænset forløb med timetal og certifikat, som kan søges optaget på kompetencefondenes positivlister (research-fund: fx HK, op til 3.500 kr/kursusdag — kræver afgrænset forløb med timetal + certifikat). Positivlistekrav pr. fond er ikke verificeret → afklares før ansøgning.

**Navn:** "Grundforløb: AI i arbejdet" · **Vejledende læringstid: 6 timer** · pr. spor (CHATGPT eller COPILOT; Copilot-version bruger `COPILOT_CHAT`-moduler + M365-modul som valgfrit).

| Blok | Indhold | Min |
|---|---|---|
| 1. Fundament | core-llm-01, core-prompt-01, core-prompt-02, core-fact-01, feat-orient-01 (+ feat-copilot-chat-01 i Copilot) | 42 (49) |
| 2. Sikker brug | core-data-01, core-policy-01, core-aiact-01, core-image-01 | 32 |
| 3. Daglige opgaver | core-mail-01, core-meeting-01, core-files-01, core-sheet-01, core-report-01, core-prompt-03 | 56 |
| 4. Værktøjets muligheder | feat-workspace-01, feat-research-01, feat-assist-01 | 31 |
| 5. AI der arbejder for dig | feat-connect-01, feat-sched-01, feat-agent-01, core-quality-01 | 46 |
| 6. Egen rolle | 1 valgfrit rollemodul | 8–12 |
| 7. Cases (`format: CASE`, ≤ 25 min hver) | `case-grundforloeb-01` "En dag i kundeservice hos Nordlys" · `case-grundforloeb-02` "Månedsafslutning i økonomi" · `case-grundforloeb-03` "Fra tilbud til levering" — flere trintyper i sammenhæng, mindre stilladsering, færre hints | 75 |
| 8. Anvendelse | core-workflow-01 + guidet "anvendelsesplan" (beskriv 2 egne arbejdsgange, ingen persondata) | 40 |
| 9. Afsluttende opgave (`format: EXAM`) | `exam-grundforloeb-01`: 2× P, 2× S, 3× J! (DATA_SECURITY/GDPR), 4× Q, 1× C. **Kun hint 1 tilladt** (`config.exam.maxHintLevel = 1`). Bestået ≥ 80 % + alle must-pass. Maks 3 forsøg pr. 24 t. | 25 |
| **I alt** | | **≈ 360** |

> **Efter § 10c:** `core-ai-01`, `core-ai-02`, `core-ai-03` (blok 1) og `core-aiact-02` (blok 2) skal med i Grundforløbet (+ ca. 28 min). Blokkene og de 6 timer er ikke regnet om endnu — se `docs/OPEN-QUESTIONS.md`.

- **Certifikat:** "Grundforløb: AI i arbejdet — gennemført" med timetal, moduloversigt og indholdsversion. Samme ansvarsfraskrivelse som øvrige certifikater (docs/05 § 8): dokumenterer gennemført træning, ikke en juridisk certificering.
- **Timetal er vejledende indtil målt:** før ansøgning til en positivliste skal medianen af målt aktiv tid (fra `Attempt`-tidsstempler) for ≥ 50 gennemførsler ligge inden for ±20 % af 6 timer; ellers justeres blok 7–8.
- Grundforløbet er en fast sammensætning (konfiguration i DB: `ProgramDefinition` — navn afventer docs/03), ikke en ny modultype.

## Niveautest → plan (input til M5)
- 12 spørgsmål (Q, S, J — **ingen LLM-kald**), ≤ 5 min, dækker: model-forståelse (2), prompting (3), faktatjek (2), datasikkerhed (3), avancerede begreber (2).
- Udfald pr. område: *sikker* (alle rigtige) → modulet markeres "kan springes over" (vises stadig; ikke påkrævet for niveau-certifikat **undtagen** `core-data-01` og `core-aiact-01`, som altid er påkrævet). *Usikker* → modulet prioriteres øverst.
- Plan-rækkefølge: Fundamental AI (anbefalet) → Niveau 1 påkrævede (AI Act og ansvarlig brug + værktøjet) → rollemodul → Niveau 2 → Niveau 3. De gratis moduler er dog `core-ai-01`, `core-prompt-01`, `core-data-01`. Copilot-brugere med "Ved ikke" om licens behandles som `COPILOT_CHAT`.
- **Sluttjek** (docs/05 § 10.3): parallel spørgsmålsbank med samme fordeling på områder; tilbydes efter bestået niveau.
- **Anbefalet tempo:** plan-generatoren foreslår moduler pr. uge ud fra niveau og samlet tid (standard 2/uge; værdier i config) og viser forventet slutdato. For erhverv med teammål beregnes tempoet mod målets dato.
- **Niveau-certifikater** (pr. spor): Niveau 1 = alle Niveau 1-moduler for sporet (minus "kan springes over" og minus Fundamental AI, som er anbefalet). Niveau 2 = alle Niveau 2 CORE/FEATURE for sporet og tier + 1 rollemodul. Niveau 3 = alle Niveau 3-moduler for sporet og tier.

## Oversigt (35 moduler + 4 i Grundforløbet)
| Niveau | CORE | FEATURE | ROLE | CASE/EXAM |
|---|---|---|---|---|
| 1 Grundlag | 13 | 2 | – | – |
| 2 Øvet | 5 | 4 | 6 | – |
| 3 Avanceret | 2 | 3 | – | – |
| Grundforløb | – | – | – | 3 + 1 |
Produktionsrækkefølge for indhold: Niveau 1 (MVP-launch, CHATGPT + COPILOT + CLAUDE) → rollemoduler → Niveau 2 → Niveau 3 → cases/eksamen. Hver PROMPT_TASK skal have golden set (≥ 20) før publicering (docs/05 § 4.3).
