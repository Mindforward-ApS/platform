# 06 — Indholdsmotor (auto-opdatering af moduler)

> Kanonisk grundlag: `docs/00-beslutninger.md` §4 + §10 og `docs/research-fund.md` ("Opdateringskilder", "Værktøjerne lige nu").
> Entitetsnavne følger §9: `ContentSource`, `SourceSnapshot`, `ChangeEvent`, `PipelineRun`, `Module`, `ModuleVersion`, `AuditLog`. Felter: se `docs/03-datamodel.md` / `prisma/schema.prisma` (C). Modul-JSON: `content/schema/module.schema.json` (B) er autoritativ for feltnavne — hvor dette dokument nævner felter (`sourceRef`, `featureRefs`, `requiresTier`), skal schemaet have dem; mangler de, rettes schemaet, ikke motoren.

## 0. Overblik

```
Inngest cron (dagligt 05:15 Europe/Copenhagen)
  └─ for hver ContentSource(enabled)        ← én PipelineRun pr. kilde pr. dag
       fetch → snapshot → diff ─┬─ ingen ændring → stop
                                └─ ChangeEvent pr. ny/ændret entry
                                     └─ classify ─┬─ irrelevant → SKIPPED
                                                  ├─ DEPRECATION/RETIREMENT → impact-analyse (altid)
                                                  └─ relevant → draft → verify → publiceringspolitik
                                                                         ├─ AUTO_PUBLISH (NEWS)
                                                                         └─ IN_REVIEW (+ GitHub-issue hvis UI/CORE)
Ugentligt (søndag 04:00): freshness-audit af alle PUBLISHED moduler.
```

Alt kører som Inngest-funktioner med `step.run` (memoiseret → genkørsel er sikker). Hvert trin skriver status, tokenforbrug og fejl til `PipelineRun`. Kode: `src/server/content-engine/`; LLM-kald kun via `src/server/ai/`; prompts versioneret som `src/server/ai/prompts/content-classify.v1.ts`, `content-draft.v1.ts`, `content-verify.v1.ts` (prompt-version + model-id gemmes på `PipelineRun` og `ModuleVersion`).

## 1. ContentSource-konfiguration

Seed i `content/sources.json` → upsert til `ContentSource` ved deploy. Kilder (præcis fra research-fund.md):

| key | track | url | parserType | note |
|---|---|---|---|---|
| `openai-chatgpt-rn` | CHATGPT | https://help.openai.com/en/articles/6825453-chatgpt-release-notes | HTML | Intercom bag Cloudflare |
| `openai-chatgpt-business-rn` | CHATGPT | https://help.openai.com/en/articles/11391654-chatgpt-business-release-notes | HTML | Intercom bag Cloudflare |
| `claude-rn` | CLAUDE | https://support.claude.com/en/articles/12138966-release-notes | HTML | Intercom bag Cloudflare |
| `ms-learn-copilot-rn` | COPILOT | https://learn.microsoft.com/en-us/copilot/microsoft-365/release-notes?accept=text/markdown | MARKDOWN | CC BY 4.0 → kreditering |
| `ms-m365-roadmap` | COPILOT | https://www.microsoft.com/releasecommunications/api/v1/m365 | JSON | filtrér produkt "Copilot" |
| `gemini-rn` | GEMINI | https://gemini.google/release-notes/ | HTML | fase 2-spor |
| `workspace-gemini-feed` | GEMINI | https://workspaceupdates.googleblog.com/feeds/posts/default/-/Gemini | ATOM | fase 2-spor |

Konfigurationsfelter pr. kilde:

```ts
type ContentSourceConfig = {
  key: string;                       // unik, stabil
  track: "CHATGPT" | "COPILOT" | "CLAUDE" | "GEMINI";
  url: string;
  parserType: "HTML" | "MARKDOWN" | "JSON" | "ATOM";
  parser: {                          // parser-specifik, versioneret
    version: number;                 // bump ved parserændring → tving fuld re-snapshot
    entrySelector?: string;          // HTML: CSS-selector for én release-entry (fx "h2, h3" + søskende til næste heading)
    dateFormat?: string;
    jsonFilter?: { field: string; includes: string[] }; // ms-m365-roadmap: products indeholder "Copilot"
  };
  license?: { name: "CC BY 4.0"; url: "https://creativecommons.org/licenses/by/4.0/"; attribution: string };
  enabled: boolean;                  // per-kilde kill switch
  autoPublishAllowed: boolean;       // false for fase 2-spor (GEMINI) indtil sporet er live
  fetchMode: "PLAIN" | "BROWSER_FALLBACK" | "MANUAL_ONLY";
};
```

Parsere: `src/server/content-engine/parsers/{html,markdown,json,atom}.ts`, alle returnerer `ParsedEntry[]`:

```ts
type ParsedEntry = {
  entryKey: string;    // stabilt id: anker/id-attribut/JSON-id/Atom <id>; ellers sha256(dato + titel)
  date: string | null; // ISO
  title: string;
  text: string;        // normaliseret ren tekst (se §3)
  url: string;         // dybt link (anker) hvis muligt, ellers kildens url
};
```

Hver parser har fixture-tests (`tests/content/parsers/*.test.ts`) med gemte rå-sider. Ændrer kilden struktur → parseren giver 0 entries → alarm (§13), ikke stille fejl.

## 2. Høflig hentning (fetch)

- **Frekvens:** én gang dagligt pr. kilde (Inngest cron `15 5 * * *` TZ Europe/Copenhagen). Concurrency 1 pr. host. Ingen manuel "hent nu" oftere end 1 gang/time (admin-knap med rate limit).
- **User-Agent (ærlig):** `MindForwardContentBot/1.0 (+https://<domæne>/bot; kontakt@<domæne>)`. `/bot`-side forklarer formål og frekvens.
- **robots.txt** hentes og respekteres (cache 24 t). Disallow → kilden sættes `MANUAL_ONLY` + alarm.
- **Betinget hentning:** gem `etag` og `lastModified` på `ContentSource`; send `If-None-Match` / `If-Modified-Since`. `304` → ingen snapshot, `PipelineRun.status = NO_CHANGE`.
- **Timeouts/limits:** connect 10 s, total 30 s, maks body 5 MB, følg maks 3 redirects (kun samme registrerbare domæne).
- **Retries:** på netværksfejl, `429`, `5xx`: 3 forsøg med backoff 1 min → 5 min → 30 min; `Retry-After` respekteres altid. `4xx` (undtagen 429) → ingen retry, fejl logges.
- **Cloudflare-fallback** (help.openai.com, support.claude.com): genkendes ved `403/503` + `cf-mitigated`/challenge-HTML.
  1. Kilden har `fetchMode = BROWSER_FALLBACK` → én headless Playwright-hentning (samme ærlige UA, ingen stealth-plugins, ingen proxy-rotation, ingen CAPTCHA-løsning). Lykkes den ikke: stop.
  2. Kilden markeres `DEGRADED`; admin får opgave i review-køen: "Indsæt release notes manuelt" (tekstfelt → snapshot med `origin = MANUAL_PASTE`, samme pipeline herfra).
  3. Forældet > 3 døgn → alarm i daglig digest.
  Vi omgår aldrig adgangskontrol. Det er en hård regel.

## 3. SourceSnapshot + hashing

1. Gem rå respons komprimeret (gzip) — `SourceSnapshot.raw` (bytea) eller Vercel Blob-nøgle; `httpStatus`, `fetchedAt`, `etag`, `origin` (`FETCH | BROWSER | MANUAL_PASTE`), `parserVersion`.
2. Parse → `ParsedEntry[]` → gem som JSON (`SourceSnapshot.entries`).
3. **Normalisering** før hash: fjern nav/footer/scripts, cookie-bannere, "updated x minutes ago", tracking-parametre i links (`utm_*`), sammenfold whitespace, Unicode NFC, trim.
4. `entryHash = sha256(entryKey + "\n" + date + "\n" + title + "\n" + text)`; `contentHash = sha256(sorterede entryHashes.join("\n"))`.
5. Unik constraint `(sourceId, contentHash)` → samme indhold gemmes aldrig to gange. Er `contentHash` = forrige snapshot → `NO_CHANGE`, stop.
6. Opbevaring: rå-HTML 90 dage; `entries` beholdes så længe et `PUBLISHED` modul refererer til snapshot (sourceRef skal kunne efterprøves).

## 4. Diff → ChangeEvent

Sammenlign entries i nyt snapshot med forrige snapshot for samme kilde:

| Tilfælde | Handling |
|---|---|
| `entryKey` ny | `ChangeEvent(kind = ADDED)` |
| `entryKey` kendt, `entryHash` ændret | `ChangeEvent(kind = MODIFIED)` + tekst-diff (gem både gammel og ny tekst) |
| `entryKey` forsvundet | ingen ChangeEvent; logges i `PipelineRun` (kilder rydder op i gamle noter) |
| > 20 nye entries i én kørsel | **anomali** (sandsynligvis omstrukturering/parser-fejl): opret ChangeEvents med `status = HELD`, ingen classify, alarm |

Idempotens: unik `(sourceId, entryKey, entryHash)`. Første kørsel for en ny kilde = **baseline**: alle entries gemmes som `BASELINE`, intet classify (ellers drafter vi hele historikken). Entries ældre end 60 dage ignoreres altid.

## 5. Classify

- Model: `CONTENT_CLASSIFY_MODEL` (lille model, fx Haiku-klasse; verificér id ved opstart), temperatur 0, struktureret output via tool-schema (Zod → JSON Schema), maks 1.500 output-tokens, input afkortet til 6.000 tokens pr. entry. System-prompt caches (prompt caching).
- Output-schema:

```ts
const Classification = z.object({
  relevance: z.number().min(0).max(1),          // relevans for danske erhvervsbrugere der lærer værktøjet
  businessFacing: z.boolean(),
  changeType: z.enum(["NEW_FEATURE","CHANGE","DEPRECATION","RETIREMENT","REGION_EXPANSION","PRICING_OR_PLAN","FIX","OTHER"]),
  plans: z.object({
    status: z.enum(["known","unknown"]),
    values: z.array(z.string()),                // fx ["Plus","Pro","Business","Enterprise"] / ["COPILOT_CHAT","COPILOT_M365"]
    evidenceQuote: z.string().nullable(),
  }),
  requiresTier: z.enum(["COPILOT_CHAT","COPILOT_M365","unknown"]).nullable(), // kun COPILOT-spor
  region: z.object({
    status: z.enum(["known","unknown"]),        // known KUN hvis kilden eksplicit nævner region/land
    values: z.array(z.string()),                // fx ["EU","EEA","worldwide","US only"]
    evidenceQuote: z.string().nullable(),       // påkrævet når status = known
  }),
  features: z.array(z.string()),                // værktøjets egne funktionsnavne, ordret
  concepts: z.array(z.enum(["ASSISTANTS","CONNECTORS","SCHEDULED_TASKS","AGENTS","PROMPTING","FILES_AND_DATA","SECURITY_PRIVACY","OTHER"])),
  effectiveDate: z.string().nullable(),         // ISO, kun hvis nævnt
  deprecations: z.array(z.object({ feature: z.string(), effectiveDate: z.string().nullable(), replacement: z.string().nullable(), evidenceQuote: z.string() })),
  needsNewSandboxUi: z.boolean(),               // kan ikke øves med eksisterende sandkasse-skin/komponenter
  affectsCore: z.boolean(),                     // ændrer noget CORE-pensum lærer (begreb, arbejdsgang, sikkerhed)
  summaryDa: z.string().max(400),
});
```

- **Regionsregel:** motoren gætter aldrig EU-tilgængelighed. `region.status = "known"` kræver `evidenceQuote`, som efterprøves deterministisk (eksakt delstreng af entry-teksten); fejler det → tvinges til `unknown`. Ved `unknown` indsætter draft fast sætning: "Tjek om funktionen er tilgængelig hos jer — udbyderen oplyser ikke region."
- **Routing efter classify:**
  - `changeType ∈ {DEPRECATION, RETIREMENT}` eller `deprecations.length > 0` → **impact-analyse** (§12) uanset relevans.
  - `relevance ≥ 0.6 && businessFacing` → draft.
  - ellers `ChangeEvent.status = SKIPPED` (gemmes; synlig i admin-loggen).
  - Tærskler i config (`CONTENT_RELEVANCE_THRESHOLD`).

### 5.1 Prompt — classify (system)

```
Du er redaktør hos MindForward, en dansk læringsplatform hvor medarbejdere i danske virksomheder lærer at bruge AI-værktøjer (ChatGPT, Microsoft 365 Copilot, Claude, Gemini) ved at øve sig.

Du får ÉN entry fra en officiel release note. Klassificér den med værktøjet `classify`. Regler:

1. Brug KUN teksten i entry'en. Ingen forhåndsviden, ingen antagelser om hvad du tror er sandt.
2. relevance (0–1): Hvor sandsynligt er det, at en almindelig dansk kontormedarbejder (salg, HR, økonomi, kundeservice, ledelse, drift) får gavn af at lære dette inden for de næste 3 måneder? Under 0,3: udviklerværktøjer, API, interne fejlrettelser, kun-mobil-kosmetik, kun-USA. Over 0,7: nye måder at arbejde på, nye assistenter/forbindelser/planlagte opgaver/agenter, ændringer i datasikkerhed, udfasning af funktioner folk bruger.
3. businessFacing: true hvis funktionen findes i et erhvervsabonnement eller i et abonnement erhvervsbrugere typisk har.
4. plans: angiv kun abonnementer der står i teksten. Står der intet: status "unknown" og tom liste.
5. region: status "known" KUN hvis teksten eksplicit nævner lande eller regioner. Citér den præcise sætning i evidenceQuote. Gæt ALDRIG — "rolling out to all users" er IKKE en regionsangivelse → "unknown".
6. requiresTier (kun Copilot): "COPILOT_CHAT" hvis teksten siger Copilot Chat / uden licens; "COPILOT_M365" hvis den kræver Microsoft 365 Copilot-licens; ellers "unknown".
7. features: funktionsnavne præcis som de står (fx "custom GPTs", "Agent Builder"). concepts: de begreber i MindForwards pensum funktionen hører under.
8. deprecations: hver funktion der udfases/fjernes/erstattes, med dato hvis nævnt og citat.
9. needsNewSandboxUi: true hvis man ikke kan øve funktionen med en generisk chat-, fil-, indbakke-, kalender- eller indstillingsvisning — dvs. der kræves en ny type skærm.
10. affectsCore: true hvis ændringen gør noget forkert eller forældet i grundpensum (egne assistenter, forbindelser, planlagte opgaver, agenter, datasikkerhed).
11. summaryDa: 1–3 sætninger på dansk, egne ord, ingen markedsføringssprog.
Er du i tvivl, vælg den forsigtige værdi: lavere relevans, "unknown", needsNewSandboxUi=true.
```

User-besked: `Kilde: {source.key} ({track})\nURL: {entry.url}\nDato: {entry.date}\nTitel: {entry.title}\n---\n{entry.text}`.

## 6. Draft

- Model: `CONTENT_DRAFT_MODEL` (lille model), temperatur 0,3, struktureret output = `content/schema/module.schema.json` (Zod-genereret tool-schema). Maks 3.000 output-tokens.
- Output: `Module(type = NEWS)` + `ModuleVersion(status = DRAFT, origin = AUTO, changeEventId)`.
- Indhold: 1–2 `READ`-trin (maks 120 ord hver) + 2–3 `QUIZ`-spørgsmål. `CLICK_TASK`/`DEMO` må motoren kun foreslå i GitHub-issuet, aldrig generere.
- **sourceRef på hver faktuel påstand.** Påstande i `READ`-tekst og i quiz-svarets forklaring er `claims[]`:

```json
{ "text": "Fra 11. december 2026 kan man ikke længere oprette eller bruge custom GPTs.",
  "kind": "FACT",
  "sourceRef": { "changeEventId": "ce_…", "snapshotId": "ss_…", "url": "https://help.openai.com/…#…",
                 "quote": "<eksakt delstreng af entry.text, ≤ 300 tegn>", "charStart": 1043, "charEnd": 1190 } }
```
  `kind = GUIDANCE` (fx "Spørg jeres IT-ansvarlige, før I slår det til") kræver ikke sourceRef, men må ikke indeholde fakta om værktøjet.
- **Egne ord + link:** ingen sætning må dele > 12 sammenhængende ord med kilden (deterministisk check i verify). Citater vises kun i admin, ikke for brugeren. Hvert modul viser: "Automatisk opdateret [dato] — kilde: [link]".
- **Microsoft Learn (CC BY 4.0):** moduler med sourceRef til `ms-learn-copilot-rn` får fast kreditering: "Bygger på 'Microsoft 365 Copilot release notes', Microsoft Learn, licenseret under CC BY 4.0 (link). Oversat og omskrevet af MindForward." Feltet sættes af kode ud fra `ContentSource.license`, ikke af modellen.
- `featureRefs` (feature-id'er fra `content/features/registry.json`, se §12) og `requiresTier` (COPILOT) sættes fra classify-output, ikke af modellen.
- Produktnavne kun beskrivende. Ingen logoer/skærmbilleder. Aldrig "GPT" i MindForwards egne navne/titler.

### 6.1 Prompt — draft (system)

```
Du skriver et kort nyhedsmodul til MindForward, en dansk læringsplatform for medarbejdere der bruger AI-værktøjer på arbejdet. Målgruppen er travle kontormedarbejdere uden teknisk baggrund. Du returnerer KUN et modul via værktøjet `draft_module` (JSON efter schemaet).

Indhold:
- 1–2 READ-trin, hver maks 120 ord. Struktur: Hvad er nyt → hvad betyder det i dit arbejde → hvad skal du gøre (evt. "ingenting").
- 2–3 QUIZ-spørgsmål med 3–4 svarmuligheder, præcis ét rigtigt svar, en kort forklaring. Spørg til forståelse og brug, ikke til datoer eller trivia, medmindre datoen er det vigtige (fx udfasning).

Faktaregler (brydes de, afvises modulet):
1. Hver faktuel påstand om værktøjet er et claim med kind "FACT" og sourceRef. quote skal være en EKSAKT delstreng af kildeteksten nedenfor, maks 300 tegn, og charStart/charEnd skal passe.
2. Brug kun det, der står i kildeteksten. Ingen forhåndsviden, ingen spekulation om fremtiden, ingen priser medmindre de står i kilden.
3. Region: {regionInstruction}  ← indsættes af kode: enten "Kilden siger: {values}" eller "Kilden oplyser ikke region. Skriv præcis: 'Tjek om funktionen er tilgængelig hos jer — udbyderen oplyser ikke region.' Skriv ALDRIG at funktionen er tilgængelig i Danmark eller EU."
4. Abonnement: {plansInstruction}
5. Skriv med dine egne ord på naturligt dansk. Kopiér ikke sætninger fra kilden. Funktionsnavne må stå på engelsk som i værktøjet (fx "custom GPTs").
6. Brug produktnavne beskrivende ("i ChatGPT", "i Microsoft 365 Copilot"). Påstå aldrig at MindForward er tilknyttet, godkendt eller anbefalet af en udbyder.
7. Ingen omtale af AI-forordningen, lovkrav, certificeringskrav eller bøder.
8. Ingen superlativer ("revolutionerende", "den bedste"), ingen sammenligning mellem udbydere.
9. Råd (kind "GUIDANCE") skal være forsigtige og generelle: følg virksomhedens retningslinjer, del ikke persondata, spørg IT.

Titel: maks 60 tegn, konkret ("Custom GPTs lukker 11. december"). Ingen udråbstegn.
```

User-besked: classification-JSON + `entry.title` + `entry.text` (med tegn-offsets markeret som `[[0]]` for hver 500. tegn for at hjælpe span-angivelse) + modulets mål-spor/tier.

## 7. Verify

Rækkefølge (stop ved første hårde fejl; alle resultater gemmes på `PipelineRun.verifyReport`):

1. **Schema:** Zod-parse + JSON Schema (`ajv`) mod `content/schema/module.schema.json`. Kun trintyper `READ` og `QUIZ` i AUTO-moduler.
2. **Deterministiske checks (kode, ingen LLM):**
   - `quote === entry.text.slice(charStart, charEnd)` for hvert claim; `snapshotId` hører til `changeEventId`; `url` har samme host som `ContentSource.url`.
   - READ ≤ 120 ord; quiz: præcis ét korrekt svar, 3–4 muligheder, ingen duplikater.
   - Ingen 12-ords-overlap med kilden (n-gram-check).
   - Region: hvis classification.region.status = unknown → standardsætningen findes ordret; ingen af ordene "Danmark", "EU", "Europa", "EØS" ellers.
   - Links: kun til `ContentSource`-hosts og MindForwards eget domæne.
   - **Forbudte påstande** (`src/server/content-engine/banned-claims.ts`, regex + ordlister, case-insensitive): `lovkrav`, `påkrævet niveau`, `certificeringskrav`, `bøde`, `AI-forordningen kræver`, `godkendt af (OpenAI|Microsoft|Anthropic|Google)`, `officiel(t)? (partner|kursus)`, `garanti`, `100 % sikker`, `tilgængelig i (Danmark|EU)` uden region-evidens, `gratis` om tredjepartsprodukt uden sourceRef.
3. **Verifikator-model (uafhængig):** `CONTENT_VERIFY_MODEL` ≠ `CONTENT_DRAFT_MODEL` — her er en større model tilladt (eneste undtagelse fra lille-model-reglen i `CLAUDE.md`; lav volumen, maks 20 kald/døgn). Ser KUN kildeteksten + liste af claims — ikke draft-prompten, ikke classification. Ét kald med alle claims, struktureret output pr. claim: `SUPPORTED | PARTIAL | NOT_SUPPORTED | CONTRADICTED` + begrundelse. Modulet består kun hvis alle FACT-claims er `SUPPORTED`.
4. **Dansk kvalitets-QA** (samme verifikator-kald, separat felt): sprog = dansk; ingen engelske sætninger (kun funktionsnavne); grammatik/stavning; tone (ikke markedsføring); forståelig for ikke-tekniker; quiz entydig. Returnerer `PASS | FIX_NEEDED` + konkrete rettelser.

Ved fejl: ét automatisk re-draft med verifikatorens feedback. Fejler det igen → `ModuleVersion.status = IN_REVIEW` med fejlrapport (hvis relevance ≥ 0,8) eller `ARCHIVED` + log (hvis lavere).

### 7.1 Prompt — verify (system)

```
Du er faktatjekker for MindForward. Du er uafhængig af forfatteren og skal være skeptisk.

Du får (A) en kildetekst fra en officiel release note og (B) en liste af påstande på dansk, hver med id og det citat forfatteren påstår understøtter den.

For HVER påstand:
- SUPPORTED: kildeteksten siger klart det samme. Oversættelse og omformulering er fint.
- PARTIAL: noget passer, men påstanden tilføjer, generaliserer eller udelader et vigtigt forbehold (fx abonnement, dato, "udrulles gradvist", "i preview").
- NOT_SUPPORTED: kildeteksten siger det ikke.
- CONTRADICTED: kildeteksten siger noget andet.
Vurdér ALTID mod hele kildeteksten, ikke kun citatet. Brug ingen forhåndsviden — hvis du "ved" noget, kildeteksten ikke siger, er påstanden NOT_SUPPORTED.

Særlige regler:
- Enhver påstand om tilgængelighed i Danmark, EU eller bestemte lande er NOT_SUPPORTED, medmindre kildeteksten nævner det eksplicit.
- Påstande om abonnementer/planer skal matche kildeteksten præcist.
- Datoer skal være præcis de samme.
- "preview", "beta", "rolling out" skal være bevaret hvis kilden siger det.

Derefter: sproglig kvalitet af HELE modulteksten (C):
- Er teksten på korrekt, naturligt dansk? Står der engelske sætninger (ud over funktionsnavne)?
- Er tonen saglig (ingen salgssprog, superlativer, bøde- eller lovkravsretorik)?
- Har hvert quizspørgsmål præcis ét forsvarligt rigtigt svar?
- Ville en kontormedarbejder uden teknisk baggrund forstå det?
Returnér language.status PASS eller FIX_NEEDED med konkrete rettelser.

Svar kun via værktøjet `verify_result`.
```

## 8. Publiceringspolitik

| Betingelse | Resultat |
|---|---|
| NEWS · kun READ+QUIZ · `needsNewSandboxUi=false` · `affectsCore=false` · verify PASS · `ContentSource.autoPublishAllowed` · `CONTENT_AUTOPUBLISH_ENABLED` · sporet er live · dagskvote ikke nået | **AUTO_PUBLISH**: `ModuleVersion.status = PUBLISHED`, `Module.publishedVersionId` sættes, badge "Automatisk opdateret [dato] — kilde: [link]", indgår i næste `MonthlyCycle` |
| `needsNewSandboxUi=true` eller `affectsCore=true` | `IN_REVIEW` + **GitHub-issue** (§9) |
| DEPRECATION/RETIREMENT med berørte moduler | NEWS-modul må auto-publiceres (hvis alle andre betingelser holder); berørte FEATURE/CORE/ROLE-moduler → `IN_REVIEW` + issue |
| verify FAIL efter re-draft | `IN_REVIEW` (relevance ≥ 0,8) ellers `ARCHIVED` |
| Region `unknown` | Tilladt — standardsætningen er obligatorisk |
| Kvote: maks 3 auto-publiceringer pr. spor pr. døgn | Overskydende → `IN_REVIEW` (anomali-værn) |

Copilot: modulets `requiresTier` vises som mærkat ("Kræver Microsoft 365 Copilot-licens" / "Virker med Copilot Chat" / "Tjek jeres licens"). Brugere med valgt niveau `COPILOT_CHAT` får ikke `COPILOT_M365`-moduler i månedspakken — de vises som "Til jer med licens".

## 9. GitHub-issue ved UI-/CORE-ændringer

- GitHub App eller fine-grained PAT (`issues:write`) på repo `greb`. Env: `GITHUB_REPO`, `GITHUB_TOKEN`.
- Idempotens: body indeholder `<!-- greb-change-event:{changeEventId} -->`; søg (`is:issue in:body greb-change-event:{id}`) før oprettelse; gem `ChangeEvent.githubIssueUrl`.
- Labels: `content-engine`, `track:{track}`, `needs-sandbox-ui` og/eller `affects-core`, `deprecation` ved udfasning.
- Issue-skabelon (tekst Claude Code arbejder ud fra):

```markdown
## Indholdsmotor: {title}
<!-- greb-change-event:{changeEventId} -->

**Spor:** {track} {requiresTier ? `· Niveau: ${requiresTier}` : ""}
**Kilde:** {entry.url} (hentet {fetchedAt}, snapshot `{snapshotId}`)
**Type:** {changeType} · Effektiv dato: {effectiveDate ?? "ikke oplyst"}
**Region:** {region.status === "known" ? region.values.join(", ") + " — \"" + region.evidenceQuote + "\"" : "ukendt — UI/tekst skal sige 'tjek tilgængelighed hos jer'"}
**Abonnement:** {plans}

### Hvad er ændret (resumé)
{summaryDa}

### Kildetekst (uddrag, til reference — må ikke kopieres ind i produktet)
> {entry.text afkortet til 1.500 tegn}

### Berørte moduler
{liste: moduleId · titel · type · publiceret version · hvilke trin/claims/featureRefs}

### Opgave til Claude Code
1. Læs `CLAUDE.md`, `docs/04-sandkasse.md`, `docs/05-moduler-og-scoring.md`.
2. {needsNewSandboxUi ? "Byg den mindste generiske sandkasse-komponent der kan øve begrebet '" + concepts + "'. Følg skin-reglerne: kun layout-regioner og generiske menubegreber, ingen logoer/farver/fonte/ikoner fra leverandøren, ingen skærmbilleder. Tilføj sandkasse-events og assertions til CLICK_TASK." : ""}
3. {affectsCore ? "Opdatér CORE-modulerne ovenfor. Begrebsbaseret pensum: funktionsnavne kommer fra content/features/registry.json, ikke hardkodet i tekst." : ""}
4. Opdatér `content/features/registry.json` (status/udfasningsdato/afløser) hvis relevant.
5. Kladde-modul (ModuleVersion `{moduleVersionId}`, status IN_REVIEW) er vedhæftet nedenfor som JSON — brug den som udgangspunkt; alle FACT-claims skal beholde sourceRef.
6. Tests: schema-validering af modulet, Playwright-test af nye CLICK_TASK-trin, ingen visuelle regressioner i eksisterende skins.
7. PR-titel: `content: {title}`; link dette issue. Publicering sker IKKE ved merge — Marco godkender i /admin/content/review.

<details><summary>Kladde-JSON</summary>

```json
{moduleVersionJson}
```
</details>
```

## 10. Admin review-kø

Route: `/admin/content/review` (kun intern rolle `GREB_ADMIN`, 2FA påkrævet — se `docs/10-compliance.md`).

- Liste sorteret efter alder; filter pr. spor/årsag (UI, CORE, verify-fejl, deprecation, freshness, manuel indsætning).
- Detaljevisning: kildeuddrag med markerede spans ved siden af hvert claim; verifikator-resultat pr. claim; diff mod forrige `ModuleVersion`; classification-JSON; link til GitHub-issue; preview som bruger ser det.
- **1-klik-handlinger:**
  - **Godkend** (`a`): publish → `PUBLISHED`, pointer flyttes, `AuditLog(action=MODULE_PUBLISH, actor, versionId)`.
  - **Afvis** (`r`): `ARCHIVED` + valgfri årsag (bruges som eval-data for prompts).
  - **Redigér** (`e`): JSON-editor med schema-validering + rendered preview → gem ny `ModuleVersion(origin=MANUAL, status=IN_REVIEW)` → kør verify-trin 1–2 (deterministiske) automatisk → Godkend.
- Ingen godkendelse via email-link. Digest linker til køen; login + 2FA kræves.
- Mål (§11 i beslutningslog): kø-tid ≤ 3 dage; Marco ≤ 2 t/uge.

## 11. Rollback og kill switch

- `ModuleVersion` er immutabel. `Module.publishedVersionId` er eneste pointer. `Attempt` refererer `ModuleVersion` → gamle resultater forbliver gyldige.
- **Rollback** (admin-knap på modul): pointer → forrige `PUBLISHED` version; nuværende → `ARCHIVED`; `AuditLog`. Findes ingen tidligere version → modulet afpubliceres (fjernes fra månedspakker; igangværende forsøg kan fuldføres).
- **Bulk-rollback:** "Rul alt tilbage fra PipelineRun X" (alle AUTO-versioner publiceret i den kørsel).
- **Kill switches** (feature-flags i config/DB efter `docs/02-arkitektur.md`, env som fallback; læses ved hvert trin — ikke cachet > 60 s):
  - `CONTENT_PIPELINE_ENABLED` — stopper alt efter fetch (snapshots gemmes stadig).
  - `CONTENT_AUTOPUBLISH_ENABLED` — alt går til `IN_REVIEW`.
  - `ContentSource.enabled` — pr. kilde.
  - Kill switch-ændring logges i `AuditLog` og vises i digest.

## 12. Impact-analyse og udfasning — eksempel: Custom GPTs (11. dec 2026)

**Feature-registry** `content/features/registry.json` (data, ikke kode; i repo):

```json
{ "id": "chatgpt.custom-gpts", "track": "CHATGPT", "concept": "ASSISTANTS",
  "aliases": ["custom GPTs", "GPTs", "GPT Builder", "egne GPT'er"],
  "status": "DEPRECATED", "retireDate": "2026-12-11",
  "replacementIds": ["chatgpt.skills", "chatgpt.plugins"] }
```

Moduler angiver `featureRefs: ["chatgpt.custom-gpts"]`. Fritekst-match på `aliases` bruges som sikkerhedsnet.

Flow når release notes melder udfasningen:
1. classify → `changeType = RETIREMENT`, `deprecations = [{feature: "custom GPTs", effectiveDate: "2026-12-11", replacement: "…", evidenceQuote}]`.
2. Map `feature` → registry-id via aliases (ukendt alias → review-opgave "nyt feature-alias").
3. Find berørte moduler: `PUBLISHED` `ModuleVersion` hvor `featureRefs ∋ id` ELLER trintekst matcher et alias. (Postgres: jsonb-containment + `ILIKE` på denormaliseret `searchText`.)
4. For hvert berørt modul: `ChangeEvent`-link (`affectedModuleIds`), mærkat i admin "Udfases 11. dec 2026", `IN_REVIEW`-kladde af ny version, GitHub-issue med label `deprecation` (§9).
5. NEWS-modul "Custom GPTs lukker 11. december — sådan flytter du dine assistenter" auto-publiceres (hvis verify PASS) og kommer i december-pakken.
6. Brugervendt: berørte moduler får banner "Funktionen udfases 11. dec 2026 — modulet opdateres" (sat af kode ud fra registry, ikke af modellen).
7. Planlagt Inngest-event `content/feature.retire-date` d. 11. dec 2026 kl. 06:00: berørte moduler der stadig er `PUBLISHED` med featureRef → alarm + fjernes fra nye `MonthlyCycle`-pakker indtil ny version er godkendt.
8. Registry-opdatering sker via PR (Claude Code) — motoren skriver ikke direkte i repoet.

## 13. Idempotens, omkostninger, metrics, alarmer

**Idempotens:** Inngest-funktion pr. trin med `idempotency`-nøgle (`{sourceId}:{date}` for fetch, `{changeEventId}` for classify/draft/verify). Unikke constraints: `SourceSnapshot(sourceId, contentHash)`, `ChangeEvent(sourceId, entryKey, entryHash)`, `ModuleVersion(changeEventId, draftAttempt)`. Publish er compare-and-set på `Module.publishedVersionId`.

**Omkostningslofter** (config, håndhævet før hvert LLM-kald; tæller i `PipelineRun.tokensIn/Out`, `costDkk`):
- Classify maks 60/døgn; draft maks 10/døgn; verify maks 20/døgn; re-draft maks 1 pr. ChangeEvent.
- Månedligt loft for indholdsmotoren: `CONTENT_MONTHLY_BUDGET_DKK` (start 300 kr). 80 % → alarm; 100 % → kun fetch/snapshot/diff, resten pauser til næste måned eller manuel løft.
- Prompt caching på alle system-prompts; input afkortes (6.000 tokens/entry).

**Metrics** (PostHog server-events + admin-dashboard):
fetch-succesrate pr. kilde · timer siden sidste vellykkede hentning · ChangeEvents/dag · andel SKIPPED · draft→verify-pass-rate · verify-fejl pr. årsag · auto-publiceret vs review · tid fra kildedato til publicering · kø-alder · rollbacks · omkostning pr. publiceret modul · freshness-fund pr. uge.

**Alarmer** (Sentry + daglig digest; kritiske også straks på mail til Marco):
- Kilde fejlet 2 døgn i træk / `DEGRADED` > 3 døgn.
- Parser giver 0 entries, eller > 20 nye entries (anomali).
- Verify-fejlrate > 50 % over 7 dage.
- Review-element ældre end 3 døgn.
- Budget 80 % / 100 %.
- **Udfasning der rammer publicerede moduler (straks).**
- Kill switch ændret.

## 14. Ugentlig freshness-audit

Inngest cron søndag 04:00:
1. For hvert `PUBLISHED` modul med sourceRefs: findes `quote` stadig i nyeste snapshot af kilden (eksakt; ellers fuzzy ratio ≥ 0,9)?
2. Mangler citatet → kør verifikator på claimet mod nyeste entry-tekst. `CONTRADICTED`/`NOT_SUPPORTED` → modulet markeres `STALE`, ny kladde → review-kø.
3. Tjek registry: moduler med featureRefs til `DEPRECATED`/`RETIRED` features → review-kø.
4. NEWS-moduler ældre end 120 dage → fjernes fra nye månedspakker (forbliver tilgængelige i arkivet).
5. CORE-moduler: rapport over hvilke features de refererer til, og hvornår kilden sidst nævnte dem.
6. Resultat i `PipelineRun(kind = FRESHNESS_AUDIT)` + sektion i ugens digest.

## 15. Tests

- Parser-fixtures pr. kilde; snapshot-hash-stabilitet (samme input → samme hash; støj-ændringer giver ingen ChangeEvent).
- Golden-set: 20 rigtige release-entries med forventet classification (incl. "rolling out to all users" → region unknown).
- Verify: injicér fejl (forkert dato, opdigtet EU-tilgængelighed, abonnement tilføjet) → skal fanges.
- Custom GPTs-scenariet end-to-end med fixture → berørte moduler flagges, issue-body genereres, NEWS-kladde består verify.
- Kill switch og rollback: integrationstest.
