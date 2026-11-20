# Research-fund (verificeret 12. okt 2026)

> Fakta som specifikationen bygger på. Kilder står ved hvert punkt. "[U]" = uverificeret.

## Lovgivning — marketing (markedsføringsloven, LBK 1420/2024)
- § 10 stk. 1: marketing via email/SMS kræver forudgående samtykke — gælder ALLE modtagere, også virksomheder og navngivne medarbejdere. https://www.retsinformation.dk/eli/lta/2024/1420 · Vejledning: https://forbrugerombudsmanden.dk/media/bjajzdv1/vejledning-om-spamforbuddet-2021-a.pdf
- Gyldigt samtykke: aktivt (ikke forudafkrydset), frivilligt (tilmelding må ikke afhænge af det), specifikt (virksomhed, kanal, produktkategorier), ikke gemt i handelsbetingelser, kan ikke indhentes via email. Tilmeldingsflowet skal dokumenteres; dobbelt opt-in anbefales.
- § 10 stk. 2 (eksisterende kunder): kun hvis adressen er givet ved KØB, kunden blev oplyst om markedsføring, har nem gratis frameldingsmulighed, og kun egne tilsvarende produkter. Adresse givet ved gratis tilbud/download er ikke et køb.
- Hver marketingmail: tydeligt markedsføring, afsender angivet, tilbuddets betingelser klare, frameldingsadresse.
- Servicemails (kontraktrelaterede) er uden for § 10 — men tilføjes upsell/tilbud, bliver de marketing. Træningspåmindelser må derfor ikke indeholde tilbud.
- Telefon: B2B-opkald er tilladt (oplys om frameldingsret; respektér Robinsonlisten for enkeltpersoner). Uanmodede opkald til forbrugere er forbudt (forbrugeraftaleloven § 4). https://forbrugerombudsmanden.dk/alle-emner/uanmodede-henvendelser/telefonsalg
- Rabatter (Forbrugerombudsmandens retningslinjer for prismarkedsføring, gælder også tjenesteydelser): førpris skal være reel og gældende lige før; tilbud højst ~10 dage eller med annonceret slutdato, aldrig længere end halvdelen af normalprisperioden; introduktionstilbud OK hvis tydeligt mærket. https://forbrugerombudsmanden.dk/publikationer/retningslinjer-og-vejledninger/vejledninger-longreads/retningslinjer-for-prismarkedsfoering
- Falsk tidsbegrænsning er forbudt uanset omstændigheder (MFL bilag 1 nr. 7) → ingen nedtællere der nulstilles.
- Håndhævelse skærpes: 4,25 mio. kr. bøde for vildledende tilbud (sep 2026).

## Lovgivning — forbrugere (forbrugeraftaleloven, LBK 1184/2025)
- Fortrydelsesret 14 dage. Bortfalder for digitalt indhold kun ved: forudgående udtrykkeligt samtykke til levering straks + erkendelse af tab af fortrydelsesret + bekræftelse på varigt medium (§ 18 stk. 2 nr. 13, § 13 stk. 2). Mangler noget: forbrugeren kan fortryde og betaler intet (§ 25). Om Greb er "digitalt indhold" eller "tjenesteydelse" er [U] → advokat. https://www.retsinformation.dk/eli/lta/2025/1184
- **Fortrydelsesknap** (§ 20 a, i kraft 19. juni 2026, lov 723/2025): knap "Fortryd aftale" synlig hele fortrydelsesperioden → online formular (navn, hvilken aftale, email) → knap "Bekræft fortrydelse" → kvittering på varigt medium med dato/tid. https://www.retsinformation.dk/eli/lta/2025/723
- Opsigelse skal kunne ske på samme medie/platform som tilmelding (§ 28 a). Løbende aftaler: opsigelse med højst 1 md. varsel efter 5 mdr. (§ 28).
- Før køb: totalpris inkl. moms, pris pr. periode og evt. minimumspris — med fed lige over bestillingsknappen; knappen skal hedde "Køb"/"Bestil med betalingsforpligtelse" ellers er forbrugeren ikke bundet (§ 12). https://www.forbrugerombudsmanden.dk/media/46756/oplysningskrav-ved-online-salg-af-abonnementer.pdf
- Gratis prøveperiode: vis den rigtige pris efter prøven, betalingsfrekvens og at abonnementet fortsætter automatisk — ikke kun i betingelserne.
- Priser til forbrugere inkl. moms. EU-forbrugere: dansk moms under €10.000/år samlet; derover kundens lands moms via OSS. EU-virksomheder: omvendt betalingspligt, verificér momsnummer.

## Lovgivning — AI-forordningen art. 4
- Ændret ved forordning (EU) 2026/1744 (i kraft 27. juli 2026): virksomheder skal "tage tiltag, der understøtter udviklingen af AI-kompetencer" hos personale — ingen krav om bestemt niveau, certifikat eller test. Dokumentation anbefales, ikke krav. https://eur-lex.europa.eu/eli/reg/2026/1744/oj · Kommissionens Q&A (27. juli 2026): https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers
- En virksomhed hvis medarbejdere bruger ChatGPT/Copilot i arbejdet er omfattet.
- Dansk tilsynsmyndighed for art. 4 er uafklaret (L 111 bortfaldt ved valget) [U].
- Salgsbudskab der holder: "dokumenteret, rollebaseret tiltag efter art. 4". Må IKKE sige: "lovkrav om certificering", "påkrævet niveau", bødetrusler.

## GDPR og varemærker
- Over for B2B-kunder er Greb databehandler → databehandleraftale med hver kunde (Datatilsynets skabelon: https://www.datatilsynet.dk/regler-og-vejledning/blanketter-og-skabeloner).
- Scores er almindelige persondata; fritekst-prompts kan indeholde følsomme data → PII-filter + kort opbevaring.
- Datatilsynet 2026-fokus: arbejdsgiveres kontrol af medarbejdere → positionér scores som læring, ikke overvågning; admin ser ikke medarbejdernes prompt-tekster.
- Microsoft og Google forbyder efterligning af deres "trade dress"/look and feel; Microsoft-skærmbilleder må ikke placeres i eget produkt-UI. OpenAI: ingen "GPT" i produktnavne, ingen antydning af godkendelse. Kilder: https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks · https://openai.com/brand/ · https://www.anthropic.com/legal/trademark-guidelines · https://partnermarketinghub.withgoogle.com/brands/google/trademarks-and-terms/trademark-guidelines-for-proper-usage/
- GUI kan være ophavsretsbeskyttet; EU-designforordningen dækker brugerflader. → Egen visuel identitet, generiske menubegreber, disclaimer. Advokatgennemgang før launch.

## Betaling og bogføring
- Stripe: per-seat via subscription quantity; Customer Portal (dansk); Stripe Tax understøtter DK. https://docs.stripe.com/subscriptions/pricing-models/per-seat-pricing
- **MobilePay via Stripe understøtter IKKE tilbagevendende betalinger** → abonnementer kører på kort. https://docs.stripe.com/payments/mobilepay
- Gebyrer: EØS-kort 1,5 % + 1,80 kr; Billing 0,7 %; Tax 0,5 %. https://stripe.com/dk/pricing
- Stripe-fakturaer er ikke e-fakturaer → offentlige kunder (EAN/Nemhandel) faktureres via e-conomic API (`sendBy: "ean"`) — fase 2.
- ApS skal bruge registreret digitalt bogføringssystem (e-conomic, Dinero, Billy er registreret). Stripe→bogføring: Pairy (fra 149 kr/md) eller Integrationspartner (199 kr/md/modul).

## Marked
- 25.569 danske virksomheder med 10+ ansatte (~2,15 mio. FTE); ~10.700 bruger AI (estimat). DST GF13 2024. https://www.statbank.dk/GF13
- Danmark nr. 1 i EU: 42 % af virksomheder bruger AI (Eurostat 2025). Men DI (sep 2026): 45 % kun ad hoc, 10 % systematisk. https://www.danskindustri.dk/arkiv/analyser/2026/09/ai-virksomheder-har-oget-bade-vakst-og-beskaftigelse/
- Største barriere i alle kilder: manglende kompetencer (80 % blandt overvejende ikke-brugere, DST). SMV-undersøgelse: 33 % efterspørger opkvalificering af medarbejdere. https://erhvervsfremmebestyrelsen.dk/sites/default/files/2026-01/SMV%27er%20og%20kunstig%20intelligens.pdf
- Værktøjsfordeling i DK er ikke målt; ChatGPT og Microsoft nævnes oftest → MVP-spor: ChatGPT + Copilot + Claude (Claude tilføjet efter Marcos beslutning 13. okt 2026).
- Claude-relevante fakta: Claude har Projects, Skills, Plugins, Connectors (bl.a. Microsoft 365, Gmail, Drive), Cowork og planlagte opgaver; Memory er slået fra som standard på Team/Enterprise. Claude-modeller kan også vælges inde i Microsoft 365 Copilot, men er slået fra som standard i EU-tenants (admin skal slå dem til).

## Konkurrenter
- Ingen dansk udbyder har sandkasse/simulering. Danske kurser: 4.000–6.000 kr pr. person pr. dag (fremmøde). E-læring (GoLearn, SecureFirst) er video + quiz.
- Leverandørernes egen træning er gratis (OpenAI Academy, Microsoft Copilot Academy, Anthropic Academy, Google Skills) men: ét værktøj hver, mest video, engelsk, måler kun gennemførelse.
- Internationalt: Section $750/seat/år; ingen fundet med multi-værktøjs-sandkasse + score + månedlig genopfriskning.
- Kompetencefonde (fx HK) dækker op til 3.500 kr/kursusdag hvis kurset står på fondens positivliste → kræver afgrænset forløb med timetal + certifikat.

## Værktøjerne lige nu (ændrer sig hurtigt)
- ChatGPT: Custom GPTs udfases 11. dec 2026 → Plugins/Skills; "ChatGPT Work" (agent); planlagte opgaver; Plugin Directory (Outlook, SharePoint, Teams…).
- Microsoft: Copilot Chat (gratis med M365) vs. Microsoft 365 Copilot (betalt, $21–30/bruger/md); Agent Builder, Copilot Studio, Notebooks, Agent Mode i Office, Copilot Cowork. Claude-modeller i Copilot er slået fra som standard i EU.
- Claude: Projects, Skills, Plugins, Connectors (inkl. Microsoft 365), Cowork, planlagte opgaver.
- Gemini: Gems → Skills (sep 2026), Workspace Studio, Deep Research.
- → Pensum bygges på begreber (egne assistenter, forbindelser, automationer, agenter); funktionsnavne er data fra indholdsmotoren.

## Opdateringskilder (officielle)
| Spor | Kilde | Format |
|---|---|---|
| CHATGPT | https://help.openai.com/en/articles/6825453-chatgpt-release-notes | HTML |
| CHATGPT | https://help.openai.com/en/articles/11391654-chatgpt-business-release-notes | HTML |
| CLAUDE | https://support.claude.com/en/articles/12138966-release-notes | HTML |
| COPILOT | https://learn.microsoft.com/en-us/copilot/microsoft-365/release-notes (`?accept=text/markdown` giver Markdown) | HTML/MD |
| COPILOT | https://www.microsoft.com/releasecommunications/api/v1/m365 (filtrér produkt "Copilot") | JSON |
| GEMINI | https://gemini.google/release-notes/ | HTML |
| GEMINI | https://workspaceupdates.googleblog.com/feeds/posts/default/-/Gemini | Atom |
- Abonnement fremgår ofte; region (EU) sjældent → hvis ukendt: "tjek tilgængelighed hos jer", aldrig gæt.
- Hent én gang dagligt, ærlig User-Agent, ETag/If-Modified-Since, retries (Cloudflare foran Intercom-sider). Skriv med egne ord + link; Microsoft Learn er CC BY 4.0 (kreditering).

## Marketing-benchmarks (estimater)
- Prøveperiode uden kort: ~18–25 % → betalende; med kort: ~49–60 % men ~70 % færre tilmeldinger.
- Quiz-leadmagnet: ~65 % gennemfører, ~40 % afgiver kontakt (leverandørdata).
- Meta DK: CPC ~7 kr. LinkedIn: estimat 30–45 kr/klik [U]. Google: tjek Keyword Planner.
- API-styring af egne annoncer er mulig (Google Ads API, Meta Marketing API). LinkedIn Ads API kræver godkendelse [U]. Automatiserede LinkedIn-beskeder/scraping er forbudt.
