# 05 – Produkt-blueprint

**Konklusion:** Byg platformen som et fast forløb på 4-6 uger med start og slut, ikke som et bibliotek. Bibliotek og prompt-skabeloner er en bonus; forløbet er produktet.

## Forløbet

```
Indgangstjek ──► Uge 1: live kickoff ┄┄► Lederkit (30 min, parallelt)
(niveau, rolle,   (første sejr
 licens)           samme dag)
                       │
                       ▼
┌──────────── Hver uge i 4-6 uger: den samme løkke ────────────┐
│                                                               │
│  Kort video ──► OPGAVE I EGET JOB ──► Feedback ──► Quiz       │
│  (<6 min,        (i jeres eget         (coach eller   (3-5    │
│   én opgave)      AI-værktøj)           live, aldrig   spørgs-│
│       ▲                                 færdigt svar)  mål)   │
│       └──── næste uges modul; spørgsmål igen efter 1 og 3 uger┘
└───────────────────────────────────────────────────────────────┘
                       │
                       ▼
Slutopgave og sluttjek ──► AI Act- og lederrapport ──► Løbende abonnement
(praktisk opgave + test,    (hvem, hvad, hvornår;      (månedlige nyheder,
 før/efter-tal pr. person)   klar til compliance)       genopfriskning ved nyt)
```

Opgaven i eget job er det, kunden reelt betaler for. Lederkittet kører parallelt med uge 1, fordi lederen er den største enkeltfaktor for, om vanen holder.

## Indholdsarkitektur

1. **Basismodul for alle (ca. 45 min):** AI-forståelse, risici og AI Act (se `04-ai-act.md`)
2. **Rollespor:** økonomi, salg, HR, ledelse, kundeservice (start med én rolle, fx økonomi)
3. **Opgave først, værktøj bagefter:** modulerne hedder fx "Skriv mødereferat" og "Lav budgetopfølgning", ikke "Copilot i Word". Demoen vises i Copilot, ChatGPT og Claude. Virksomheden vælger sit værktøj; opgaven er den samme.
4. **Bibliotek (bonus):** prompt-skabeloner og opslag til "kopiér og brug"

## Modulskabelon (4 dele)

| Del | Indhold | Længde | Genindspilles ved UI-ændringer? |
| --- | --- | --- | --- |
| 1. Genkendelse | "Vi kender det alle sammen": et genkendeligt problem fra rollen | 30-60 sek. på kamera | Nej |
| 2. Princippet | Hvorfor det virker, og hvad du får ud af det | 1-2 min. på kamera | Nej |
| 3. Demo | Skærmoptagelse i værktøjet | 2-3 min. | Ja, kun denne del |
| 4. Opgave | Prøv det selv på en rigtig opgave, med prompt-skabelon | Deltagerens egen tid | Nej |

Efter hver lektion: 3-5 quizspørgsmål. Samme spørgsmål kommer igen efter 1 og 3 uger (via mail eller Teams).

## Forslag til ugeplan (6 uger, økonomispor)

| Uge | Tema | Opgave i eget job | Live |
| --- | --- | --- | --- |
| 0 | Indgangstjek og basismodul (AI Act) | Kortlæg 3 opgaver, du bruger meget tid på | – |
| 1 | Kom i gang: første sejr | Brug AI på én af dine 3 opgaver i dag | Kickoff (60 min) |
| 2 | Skriv bedre og hurtigere | Mails, referater, opsummeringer | 45 min Q&A |
| 3 | Tal og analyse | Budgetopfølgning, afvigelsesforklaring | 45 min Q&A |
| 4 | Kvalitet og risiko | Fang fejl, tjek fakta, beskyt data | 45 min Q&A |
| 5 | Saml det i din arbejdsgang | Byg din egen faste arbejdsgang med AI | 45 min Q&A |
| 6 | Slutopgave og sluttjek | Praktisk opgave + før/efter-måling | Afslutning og certifikat |

## Måling

- **Indgangstjek og sluttjek** pr. deltager (byg videre på Copilot-tjekket)
- **Selvrapporteret sparet tid** pr. uge
- **Hovedmål:** andel der bruger AI ugentligt i en rigtig opgave
- **Sekundært:** gennemførelse, aktivitet i uge 1, quizresultater

## Krav til platformen (afklares med 3 HR-købere)

- [ ] Rapportering pr. virksomhed (aktive, bestået, mangler, genopfriskning)
- [ ] Administratoradgang for HR/L&D
- [ ] Eksport af AI Act-dokumentation
- [ ] Låsning af moduler ved bestået praktisk tjek
- [ ] Opdeling i rollespor
- [ ] Ugentlige påmindelser og quizgentagelse (mail eller Teams)
- [ ] Mulighed for at deltage uden at skulle poste offentligt over for kolleger
- [ ] Professionelt udseende til erhvervskunder
- [ ] Senere: integration af AI-coachen

**Åbent spørgsmål:** Kan Skool levere ovenstående, eller skal der et andet værktøj til, enten ved siden af Skool eller i stedet for?

## Roller i forløbet

- **Deltager:** gennemfører forløbet og løser opgaver i sit eget job
- **Leder:** får et lederkit på 30 min. med hvad man kan forvente, hvordan man følger op og en mødeskabelon
- **Ambassadør:** 1 pr. 15-20 medarbejdere; får et udvidet forløb og hjælper kollegerne
- **AIK-underviser:** kickoff, ugentlige live-sessioner, feedback
- **AI-coach (senere):** feedback mellem live-sessionerne
