# Udkast: Marcos beslutninger 18. nov. 2026 (ikke indarbejdet endnu)

> **Status: udkast — ikke en del af den gældende specifikation.** Teksten blev skrevet 18.–20. nov. 2026 oven på den gamle specifikation på `main` (kun M0), før platformen blev flettet ind. Paragrafnumre, entitetsnavne, milestones og priser i teksten passer derfor ikke nødvendigvis til den rigtige platform (fx findes § 10b–10i allerede med andet indhold, og henvisninger til "§ 10b"/"§ 10c" herunder betyder Udkast A/B).
> Beslutningerne selv er Marcos og gælder: ugentlig streak, fælles teammål, anbefalet tempo, før/efter-måling, genopfriskningsspørgsmål, skabelon til eget job, ugentligt tjek-ind, kontekstbibliotek for privat og erhverv med personalisering uden for sandkassen, og Fundamental AI som anbefalet område.
> De skal holdes op mod det, der allerede er bygget, og derefter skrives ind i `docs/00-beslutninger.md` som nye afsnit. De fulde dokumentændringer (produkt, datamodel, moduler, compliance, roadmap, pensum) ligger i git-historikken på commit `564f389`.

## Udkast A. Rettelser efter læringsresearch og erfaringer fra AI Minds (18. nov 2026) — besluttet af Marco
Gælder forud for resten af pakken, inkl. § 10 og § 10a (§ 10c vinder over denne). Baggrund og kilder: `docs/research/` (kontekst, ikke byggekrav). Åbne punkter: `docs/OPEN-QUESTIONS.md`.
Fundamentet er uændret: sandkasse, Nordlys-data, modulsystem, scoring, priser og stack. Punkterne her er tilføjelser.

**Fælles for privat og erhverv**
- **Sluttjek (før/efter-måling):** niveautesten er indgangstjek. Når et niveau er bestået, tilbydes et sluttjek (samme områder, andre spørgsmål, ingen LLM-kald). Resultatet vises som før/efter pr. område. Sluttjekket er frivilligt og ikke en betingelse for certifikat.
- **Genopfriskningsspørgsmål:** spørgsmål fra beståede moduler (`QUIZ`, `SPOT_ERROR`, `JUDGMENT`) kommer igen efter ca. 1 og 3 uger — i appen ("Ugens genopfriskning", ca. 2 min) og i månedspakken. De kan ikke sænke et bestået resultat. Ingen nye mails i MVP.
- **Brug det i dit eget job:** hvert modul kan slutte med en skabelon (`takeaway`), som brugeren kopierer til sit eget værktøj. Skabelonerne fra beståede moduler samles i "Mine skabeloner". Sandkassen rører stadig kun Nordlys-data.
- **Ugentligt tjek-ind:** frivilligt, to klik: "Brugte du AI i en rigtig opgave i denne uge?" og ca. sparet tid (intervaller, ingen fritekst). Hovedmålet for produktet er andelen, der bruger AI ugentligt i en rigtig opgave.
- **Ugentlig streak:** en uge tæller, når brugeren har gennemført mindst én læringsaktivitet. Én uge uden aktivitet sætter streaken på pause; to i træk nulstiller den. Ingen skyld-beskeder, ingen nedtællere. Streaken er kun synlig for brugeren selv.
- **Anbefalet tempo, ikke fast forløb:** der er intet fast forløb med hold og slutdato. Planen foreslår et tempo ud fra niveautesten (fx 2 moduler om ugen → forventet slutdato), som brugeren kan ændre eller slå fra.
- **Coach-princip:** hint 1–2 og al feedback hjælper brugeren videre uden at aflevere det færdige svar; kun hint 3 viser løsningen (0 point). Ingen AI-tutor/-coach i MVP. Bygges den senere, må den aldrig løse opgaven for brugeren, og den testes på én gruppe først.
- **Aldrig individuelle ranglister** — hverken mellem kolleger eller mellem private brugere.

**Kun privat (`Organization.type = PERSONAL`)**
- Personlig streak, eget ugemål og anbefalet tempo. Ingen teamfunktioner. *(Ændret i § 10c: private har også et kontekstbibliotek.)*

**Kun erhverv (`Organization.type = BUSINESS`)**
- **Fælles teammål:** OWNER/ADMIN sætter ét mål ad gangen (fx "80 % har bestået Niveau 1 inden [dato]"). Alle medlemmer ser samlet fremdrift — aldrig navne.
- **Fælles startdato (valgfri):** OWNER/ADMIN kan sætte en dato, hvor teamet starter. Før datoen kan medarbejderne tage niveautesten; på datoen åbner planen, og alle får en SERVICE-mail.
- **Kontekstbibliotek ("Hos os"):** OWNER/ADMIN kan lægge virksomhedens egne oplysninger ind, så træningen bliver konkret: AI-politik, godkendte værktøjer, dataregler (hvad må/må ikke indsættes), hvem man spørger, kort om forretningen og typiske opgaver. Tekst, link eller PDF. Versioneret.
  - Medarbejdere bekræfter, at de har læst AI-politik og dataregler; ny version kræver ny bekræftelse. Version og dato indgår i virksomhedsrapporten.
  - Indholdet vises ved relevante moduler og på medarbejderens side "Hos os".
  - Sandkassen og bedømmelsen kører fortsat kun mod Nordlys-data. *(Ændret i § 10c: sprogmodellen må bruge konteksten til personalisering uden for sandkassen.)*
  - Må ikke indeholde persondata eller forretningshemmeligheder; PII-filteret kører ved gem.
- **Tjek-ind og streaks vises kun samlet til admin** (og kun ved mindst 5 svar) — aldrig pr. person. *Antagelse: Marco har ikke svaret på dette punkt; anbefalingen er fulgt.*
- **AI-tjek af teamet:** prøveperioden (14 dage, op til 5 brugere) + niveautesten giver admin et teamoverblik (niveaufordeling, svageste områder, anbefalet start), der kan hentes som PDF.
- **Lederkit:** en kort side til ledere under `/virksomhed`: hvad man kan forvente, hvordan man følger op, mødeskabelon.
- **Virksomhedsrapporten udvides:** jobrolle, spor/licensniveau, grundmodul gennemført (dato), før/efter-resultat, bekræftet politik-version, dato for næste genopfriskning og en oversigt, der kobler tiltaget til trinnene i DS/PAS 2500-4.
- **Genopfriskning ved hændelser:** ud over månedspakken ved skift af jobrolle eller spor og én gang årligt (grundmodulets spørgsmål + ny bekræftelse af politik).

**Pensum og budskaber**
- **Grundmodul (art. 4)** *(udvidet i § 10c)*: `core-llm-01`, `core-fact-01`, `core-data-01`, `core-policy-01`, `core-aiact-01` (ca. 40 min) er grundmodulet for alle. Det dækker AI-forståelse, risici (hallucinationer, persondata, fortrolighed, bias, ophavsret via `core-image-01`), virksomhedens politik og hvad forordningen betyder for medarbejderen.
- **Moduler navngives efter arbejdsopgaven**, ikke efter værktøjet (bekræfter § 10 "begrebsbaseret").
- **Salgssiden `/virksomheder`:** problem → dokumentation (rapport-eksempel; målte resultater først når de findes) → det, de gratis akademier ikke giver (dansk, øvelse i praksis, dokumentation) → sådan foregår det → én knap. Aldrig bødetrusler, aldrig "kun 10 % af træning overføres", ingen opdigtede resultater.

**Nye entiteter (tilføjes skemaet i M2):** `WeeklyActivity`, `ReviewItem`, `UsageCheckIn`, `TeamGoal`, `ContextItem`, `ContextAcknowledgement`. Nye felter: `PlacementResult.kind` (ENTRY|EXIT), `TrackEnrollment.weeklyGoalModules`, `Organization.programStartsAt`. Detaljer: `docs/03-datamodel.md` § 15.

**Ikke med (bliver kontekst):** videoer, live-sessioner, webinarer, hold med fast start og slut, ambassadørprogram, pakkepriser, garanti, Skool. Ændrer ikke priser, B2C/B2B-model eller stack.

## Udkast B. Navn, kontekstbibliotek for alle og Fundamental AI (18. nov 2026) — besluttet af Marco
Gælder forud for resten af pakken, inkl. § 10, § 10a og § 10b.

**Navn**
- Produktet hedder **Mindforward**. Tekniske id'er beholder kodenavnet `greb`. Juridisk enhed (vilkår, DPA, fakturaer) er fortsat et åbent spørgsmål.

**Kontekstbibliotek for både privat og erhverv — og sprogmodellen må bruge det**
- **Erhverv:** hver virksomhed har sit eget område med et kontekstbibliotek, som OWNER/ADMIN vedligeholder (som i § 10b).
- **Privat:** den private bruger har sit eget kontekstbibliotek ("Om mig og mit arbejde"): rolle, branche, typiske opgaver, værktøjer, mål og egne noter/dokumenter.
- **Personalisering sker for alle — uanset plan og uanset om kontekstbiblioteket er udfyldt** (præciseret af Marco 18. nov 2026). Den bygger på brugerens **udgangspunkt**: niveau pr. område fra niveautesten, hvor i planen brugeren starter, den specifikke jobrolle og det valgte værktøj. Kontekstbiblioteket gør den mere præcis, men er ikke en forudsætning. Gratis brugere får den også.
- Sprogmodellen bruger udgangspunktet (og kontekstbiblioteket, når det findes) til at gøre undervisningen personlig — uden for sandkassen:
  1. "Derfor er det relevant for dig" på modulintro.
  2. Modulets skabelon til eget job (`takeaway`) tilpasset rolle, branche og virksomhed.
  3. En kort anbefaling på planen (fokus og tempo).
- **Sandkassen får aldrig kundedata** og er uændret: øvemodellen, scenerne, opgaverne og bedømmelsen kører kun mod Nordlys-data og kender ikke kontekstbiblioteket. Personalisering ændrer aldrig score, spørgsmål, certifikat eller rapport.
- **Hvad der må ligge i biblioteket:** egne oplysninger om rolle, opgaver og mål; virksomhedens politik, regler og beskrivelse. **Aldrig** kundedata, andres persondata, CPR-/kort-/kontonumre eller forretningshemmeligheder. PII-filteret blokerer ved gem og igen før hvert LLM-kald.
- AI-politik og dataregler vises altid ordret — modellen omskriver dem ikke.
- Personaliseret tekst mærkes "Tilpasset til dig — automatisk genereret", går gennem `banned-claims`-filteret og falder tilbage til den generelle tekst ved fejl. Resultatet gemmes (`PersonalizedContent`) og genbruges, til konteksten eller modulet ændres; uden kontekstbibliotek deles teksten mellem alle med samme profil (værktøj + jobrolle + niveau pr. område); med kontekstbibliotek genereres den pr. virksomhed + jobrolle + niveau (erhverv) eller pr. bruger (privat). Kun niveauet bruges — aldrig testsvarene.
- Brugeren/virksomheden kan altid slette sit indhold; afledt personaliseret tekst slettes med.
- Dette afløser § 10b-punktet "Indholdet sendes ikke til sprogmodellen i MVP". Databehandleraftale og privatlivspolitik skal dække behandlingen (advokatgennemgang før launch).

**Fem indgange i pensum**
- **Fundamental AI** · **AI Act og ansvarlig brug** · **ChatGPT** · **Microsoft 365 Copilot** · **Claude** (Gemini i fase 2).
- De tre værktøjer er fortsat spor (`Track`) med sandkasse-skin. Fundamental AI og AI Act er **områder** (`area` på modulet), der er fælles for alle spor og ligger først i alles plan.
- **Fundamental AI er en anbefaling, ikke et krav** (besluttet af Marco 18. nov 2026): modulerne står øverst i planen mærket "Anbefalet", kan springes over og er ikke en betingelse for certifikat. Viser niveautesten, at brugeren er usikker på området, fremhæves de som "Anbefalet til dig". Ingen ny struktur: det er `CORE`-moduler for alle spor.
- **Fundamental AI** (nyt): hvad AI er og ikke er, hvor det kommer fra (fra 1950'erne til i dag), hvad en sprogmodel er, og hvorfor det er vigtigt for dig og dit arbejde. Moduler: `core-ai-01`, `core-ai-02`, `core-llm-01`, `core-ai-03`.
- **AI Act og ansvarlig brug:** `core-data-01`, `core-policy-01`, `core-aiact-01`, nyt `core-aiact-02` (roller og risikoniveauer), `core-image-01`. Navnet "AI Act" bruges om emnet — aldrig om et certifikat.
- **Grundmodul (art. 4)** er: `core-fact-01`, `core-data-01`, `core-policy-01`, `core-aiact-01` (ca. 34 min). Fundamental AI er anbefalet ved siden af og vises i virksomhedsrapporten som gennemført/ikke gennemført pr. medarbejder — aldrig som et krav. `core-llm-01` følger sit område og er dermed også anbefalet (var før påkrævet på Niveau 1).

**Nye/ændrede entiteter (M2):** `ContextItem` og `ContextAcknowledgement` (omdøbt fra `OrgContext…`; gælder nu både BUSINESS og PERSONAL), ny `PersonalizedContent`, ny `AiFeature`-værdi `PERSONALIZATION`, nyt modul-felt `area`. Detaljer: `docs/03-datamodel.md` § 15, `docs/05-moduler-og-scoring.md` § 10.

