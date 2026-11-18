# 00 — Start her

Sådan bygger du MindForward med Claude Code: én milestone ad gangen, med plan før kode og test før merge.

## 1. Før M0 — konti du skal oprette

Opret med firma-mail under Esther Gruppen ApS. Brug 2FA overalt. Gem nøgler i en password manager — aldrig i chatten eller repoet. Navne på miljøvariabler står i `.env.example`. Prisplaner tjekker du selv på udbydernes sider ved oprettelse; start på gratis-/test-niveau hvor det findes.

| Konto | Bruges til | Bemærkning |
|---|---|---|
| GitHub | Repo `greb`, PR'er, CI (GitHub Actions), issues fra indholdsmotoren | Privat repo |
| Vercel | Hosting; `main` deployer til produktion | Forbind til GitHub-repo; function region `fra1` |
| Neon | Postgres | Region AWS Frankfurt (`eu-central-1`); separat branch til preview/test |
| Anthropic API | Sandkassens øvemodel, bedømmelse, indholdsmotor, support | Sæt forbrugsgrænse i konsollen fra dag 1 |
| Stripe | Abonnementer (kort) | Testmode indtil launch; Customer Portal på dansk; MobilePay kan ikke bruges til abonnementer |
| Resend | Transaktions- og marketingmail | Verificér afsenderdomæne (SPF/DKIM/DMARC) |
| Inngest | Baggrundsjobs + cron | Forbind til Vercel |
| PostHog | Produktanalyse | **EU Cloud**-region |
| Sentry | Fejl- og performance-overvågning | EU-datalagring hvis muligt |
| Domæne | Produktdomæne + mail-domæne | Navnet "MindForward" er ikke tjekket — tjek domæne og varemærke først |
| e-conomic | Bogføring (+ Pairy eller Integrationspartner til Stripe-posteringer) | EAN-fakturering er fase 2 |

SSO kræver også app-registreringer hos Microsoft Entra ID og Google Cloud (OAuth) — gøres i M1, Claude Code guider dig.

## 2. Arbejdsgang pr. milestone

1. **Prompt** — kopiér milestone-skabelonen (§ 4), udfyld milestone-nummer.
2. **Plan** — Claude Code læser docs og leverer plan + filliste + tests + åbne spørgsmål. Den må ikke skrive kode endnu.
3. **Godkend** — læs planen. Svar "Godkendt" eller ret til. Besvar åbne spørgsmål (eller opdatér `docs/00-beslutninger.md`).
4. **Byg** — tests først for logik, derefter kode, små commits.
5. **Checks** — `pnpm typecheck && pnpm lint && pnpm test` (+ `pnpm e2e` for berørte flows) skal være grønne.
6. **Push til `main`** — rapport i chatten pr. milestone: hvert acceptkriterie + bevis, åbne spørgsmål.
7. **Du tester på Vercel-deployet fra `main`** — følg "Sådan tester Marco"-punkterne i rapporten. Fejl → bug-skabelon (§ 5). Til sidst review-skabelon (§ 6).

Designsessioner: før M3, M4, M5 (offentlig testside) og M7 (admin-UI) skal du vælge design. Se `docs/11-roadmap.md`. Claude Code laver flere visuelle versioner af én skærm ad gangen; du vælger. Indtil da bruges neutrale placeholders.

## 3. Kickoff-prompt (indsæt ordret i første session)

```
Du skal bygge "MindForward" — en dansk SaaS til hands-on AI-træning af medarbejdere.
Hele specifikationen ligger i dette repo.

Læs i denne rækkefølge, FØR du gør noget andet:
1. CLAUDE.md
2. docs/00-beslutninger.md (afsnit 10 "Rettelser" går forud for resten)
3. docs/research-fund.md
4. docs/11-roadmap.md
5. docs/02-arkitektur.md og docs/03-datamodel.md

Skriv derefter IKKE kode. Svar med:
A) Din forståelse af MindForward i 5 linjer.
B) Konflikter eller uklarheder du har fundet mellem dokumenterne (med filnavn + afsnit).
   Tilføj dem også til docs/OPEN-QUESTIONS.md (opret filen).
C) Plan for M0 efter skabelonen nedenfor.

Plan-skabelon:
- Mål (1 linje)
- Filer der oprettes/ændres (fuld sti + formål)
- Tests du skriver først (navn + hvad de beviser)
- Afhængigheder du vil installere — verificér aktuel version og docs for hver
- Hvad du har brug for fra mig (konti, nøgler, beslutninger)
- Hvordan hvert acceptkriterie i M0 bliver bevist
- Risici / usikkerheder

Regler: Følg CLAUDE.md. Ingen arbejde uden for M0. Er noget uklart: stop og spørg —
improvisér ikke. Vent på at jeg skriver "Godkendt" før du bygger.
```

## 4. Milestone-skabelon (genbrug for M1–M10)

```
Vi bygger nu M<N> — <navn> fra docs/11-roadmap.md.

Læs først: CLAUDE.md, docs/00-beslutninger.md (afsnit 10 går forud), afsnittet M<N>
i docs/11-roadmap.md og alle docs der står under "Læs" i det afsnit.
Tjek docs/OPEN-QUESTIONS.md for åbne punkter der rører M<N>.

FASE 1 — PLAN (ingen kode):
1. Mål for M<N> i én linje.
2. Filliste: hver fil der oprettes/ændres + formål.
3. Tests du skriver FØR koden (unit for al logik; e2e hvis milestonen kræver det).
4. Datamodel-/migrationsændringer.
5. Nye afhængigheder — verificér aktuel version og docs.
6. Mapping: hvert acceptkriterie → hvordan det bevises (test, kommando, preview-trin).
7. Usikkerheder og beslutninger du mangler (også skrevet i docs/OPEN-QUESTIONS.md).
Stop og vent på "Godkendt".

FASE 2 — BYG (efter godkendelse):
- Tests først for logik, så implementation. Små conventional commits direkte på main (checks grønne før hvert push).
- Hold dig inden for scope. Ser du noget uden for scope: notér det, byg det ikke.

FASE 3 — RAPPORT:
- Kør pnpm typecheck, pnpm lint, pnpm test (+ pnpm e2e hvis relevant). Indsæt output-resumé.
- For HVERT acceptkriterie: [x]/[ ] + bevis (testnavn, output, fil:linje eller preview-trin).
- "Sådan tester Marco": 3–8 konkrete klik-trin på Vercel-deployet fra main.
- Alt du er usikker på eller har antaget.
- Push til main og giv rapporten i chatten.
```

## 5. Bug-skabelon

```
Bug i M<N>.

Hvad jeg gjorde: <trin>
Forventet: <hvad der burde ske>
Faktisk: <hvad der skete, fejlbesked, URL, skærmbillede>
Miljø: <preview-URL / lokal, browser, rolle (OWNER/ADMIN/LEARNER), B2B/B2C>

Gør sådan:
1. Læs CLAUDE.md og de relevante docs for området.
2. Reproducér: skriv FØRST en test der fejler og viser buggen.
3. Find rodårsagen og forklar den i 2–3 linjer, før du retter.
4. Ret minimalt — ingen refaktorering eller nye features udover fixet.
5. Kør pnpm typecheck, pnpm lint, pnpm test (+ e2e hvis berørt). Vis output.
6. Rapportér: rodårsag, fix, test der nu består, andre steder samme fejl kan findes,
   og hvad du er usikker på.
```

## 6. Review-skabelon (før merge)

```
Review ændringerne for M<N> (commits på main) mod CLAUDE.md, docs/00-beslutninger.md og M<N> i docs/11-roadmap.md.
Skriv ikke ny kode — rapportér kun.

Tjek og rapportér med fil:linje:
1. Acceptkriterier: er hvert enkelt bevist? Hvilke mangler?
2. Sikkerhed: authz-helper i hver server action/route, org-scoping på hver query,
   webhook-signatur, ingen secrets klientside, rate limits på AI-endpoints.
3. Privatliv: kan en admin se prompt-tekster nogen steder? PII-filter i sandkassen?
4. Typer: any, ts-ignore, manglende Zod ved grænser.
5. Omkostninger: LLM-kald udenom src/server/ai/, hardcodede model-id'er,
   manglende caching/budgetcheck.
6. ALDRIG-listen i CLAUDE.md: er nogen overtrådt?
7. Hardcodede priser, UI-tekst eller farver uden for tokens.css.
8. Manglende tests for logik.
9. Scope creep: kode der ikke hører til M<N>.
Konklusion: KLAR TIL MERGE / RET FØRST (liste i prioriteret rækkefølge).
```

## 7. Gode vaner
- Ny session pr. milestone. Lange sessioner: bed om et resumé og start forfra med det.
- Ændrer du en beslutning, så ret `docs/00-beslutninger.md` først — og sig det til Claude Code.
- Merge aldrig med røde checks. Merge aldrig noget, du ikke har klikket igennem på preview.
