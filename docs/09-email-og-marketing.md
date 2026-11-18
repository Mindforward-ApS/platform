# 09 — Email og marketing

> Kanonisk: `docs/00-beslutninger.md` §7 + §10 (samtykke også B2B, ingen mails til testtagere uden aktivt samtykke, rabatregler, marketingloft 20.000 kr/md). Lov: `docs/research-fund.md` "Lovgivning — marketing" (markedsføringsloven LBK 1420/2024 § 10, bilag 1 nr. 7; Forbrugerombudsmandens prismarkedsføringsretningslinjer).
> Entiteter (§9): `ConsentRecord`, `EmailMessage`, `User`, `Organization`, `Membership`, `MonthlyCycle`, `MonthlyAssignment`, `PlacementResult`, `AuditLog`. Kode: `src/server/email/`, templates `src/server/email/templates/*.tsx` (React Email), Resend.

## 1. To kategorier

| | `SERVICE` | `MARKETING` |
|---|---|---|
| Formål | Opfylde aftalen/kontoen: login, kvittering, ordrebekræftelse, fortrydelseskvittering, fakturaproblemer, træningspåmindelser, prøveperiode-info, sikkerhed, admin-rapport, eskalations-kvittering | Tilbud, nyhedsbrev, rabatter, lead-nurture, win-back, forladt checkout |
| Retsgrundlag | Kontrakt/aftale (uden for MFL § 10) | Forudgående samtykke (MFL § 10 stk. 1) — **også over for virksomheder og navngivne medarbejdere** |
| Indhold | **Aldrig** tilbud, rabatter, upsell, "opgrader", priser som salgsargument. Indeholder et tilbud, er det marketing. | Tydeligt markedsføring, afsender angivet, betingelser klare, afmeldingslink |
| Afsender | `MindForward <hej@mail.greb.dk>` (§8) | `MindForward <nyt@news.greb.dk>` (separat subdomæne) |
| Afmelding | Kun hvor relevant (påmindelser kan slås fra i indstillinger) | Afmeldingslink + `List-Unsubscribe` + `List-Unsubscribe-Post` (one-click) i hver mail |

Kategori er **egenskab ved templaten** (`template.category`), ikke ved kaldet. CI-test: alle `SERVICE`-templates renderes og scannes for forbudte ord (`rabat`, `tilbud`, `spar`, `kampagne`, `opgrader`, `kun i dag`, `%`-rabat-mønstre, promotion-links `?promo=`) → fejl.

**Eksisterende kunder (MFL § 10 stk. 2):** Bruges **ikke** som grundlag i MVP. Vi kræver altid aktivt samtykke (enklere, ens for B2B/B2C; adresser fra gratis test er ikke "køb").

## 2. Samtykkemodel

`ConsentRecord` (append-only; seneste række pr. `(subjectEmail, purpose, channel)` gælder):

```ts
{
  id, userId?, subjectEmail,                 // email normaliseret (lowercase, trim)
  purpose: "MARKETING_EMAIL" | "IMMEDIATE_ACCESS_REQUEST" | "WITHDRAWAL_LOSS_ACK", // + evt. flere; checkout-formål: se docs/07-betaling.md §8.2
  channel: "EMAIL",
  action: "GRANTED" | "CONFIRMED" | "WITHDRAWN",
  source: "PLACEMENT_RESULT" | "SIGNUP" | "ACCOUNT_SETTINGS" | "CHECKOUT" | "FOOTER_FORM" | "ADMIN_IMPORT_FORBIDDEN",
  textVersion: "marketing-consent.v1",       // fil i content/legal/
  textHash: "sha256…",                        // af den viste tekst
  ip, userAgent, createdAt,
  confirmationTokenHash?, confirmedAt?
}
```

**Samtykketekst (v1, ikke forudafkrydset, ikke betingelse for testresultat/konto):**
> ☐ Ja tak, MindForward må sende mig tips om AI på arbejdet, nyheder om MindForward og tilbud på MindForwards abonnementer på email. Jeg kan altid afmelde mig med ét klik.
(Specifik: virksomhed = MindForward (Esther Gruppen ApS-selskab, navn fra config), kanal = email, kategorier = AI-læring + MindForwards abonnementer. Endelig ordlyd `[JURA: verificeres]`.)

**Dobbelt opt-in:** `GRANTED` → SERVICE-agtig bekræftelsesmail `marketing-confirm` (ingen markedsføringsindhold; kun "Bekræft at du vil modtage mails fra MindForward", knap, udløber 7 dage) → klik → `CONFIRMED`. Kun `CONFIRMED` = gyldigt. Ubekræftede GRANTED slettes efter 30 dage. Samtykke kan aldrig indhentes via email (vi sender kun bekræftelse af samtykke givet i UI).

**Afmelding:** link med signeret token (HMAC, ingen login) → `/afmeld?t=…` → én knap "Afmeld" (one-click POST understøttes også fra mailklient) → `WITHDRAWN` + suppression. Virker straks; ingen "er du sikker"-labyrint. Også i `/konto/indstillinger`.

**Suppression-liste** (`EmailSuppression` — teknisk tabel; afklar navn med C, ellers felt på `ConsentRecord`): email-hash + årsag (`UNSUBSCRIBED`, `HARD_BOUNCE`, `COMPLAINT`, `MANUAL`). Resend-webhooks `email.bounced` (hard) og `email.complained` → suppression for MARKETING; hard bounce suppresser også SERVICE undtagen sikkerheds-/login-mails til ny adresse.

### 2.1 Hård send-time consent gate (kode)

Eneste vej ud: `sendEmail()` i `src/server/email/send.ts`. Direkte brug af Resend-klienten andre steder er forbudt (ESLint `no-restricted-imports` på `resend` uden for `src/server/email/`).

```ts
export async function sendEmail<T extends TemplateKey>(input: {
  template: T; to: string; data: TemplateData<T>; idempotencyKey: string; userId?: string;
}) {
  const tpl = templates[input.template];
  const to = normalizeEmail(input.to);
  if (await isSuppressed(to, tpl.category)) return skip("SUPPRESSED");
  if (tpl.category === "MARKETING") {
    if (!flags.MARKETING_EMAIL_ENABLED) return skip("KILL_SWITCH");
    const consent = await latestConsent(to, "MARKETING_EMAIL", "EMAIL");
    if (!consent || consent.action !== "CONFIRMED") return skip("NO_CONSENT");       // checkes VED AFSENDELSE, ikke ved planlægning
    if (!(await withinFrequencyCaps(to))) return skip("FREQUENCY_CAP");
    if (quietHours(nowCph())) return defer("QUIET_HOURS");                             // 20:00–08:00 + søn/helligdag
  }
  // EmailMessage(unique idempotencyKey) → insert-or-skip; derefter Resend send med Idempotency-Key header
  // MARKETING: tilføj List-Unsubscribe, afmeldingslink, fysisk afsender (navn, CVR, adresse) i footer
}
```

Unit tests (krav): ingen MARKETING uden `CONFIRMED`; `WITHDRAWN` efter `CONFIRMED` blokerer; samtykke givet til anden email blokerer; planlagt flow hvis samtykke trækkes tilbage før afsendelse → skip; suppression slår alt; SERVICE-template med forbudt ord fejler i CI.

## 3. Templates

| key | Kategori | Trigger |
|---|---|---|
| `magic-link` | SERVICE | login |
| `welcome-account` | SERVICE | konto oprettet (ingen tilbud) |
| `invitation` | SERVICE | admin inviterer |
| `marketing-confirm` | SERVICE (bekræftelse) | samtykke givet |
| `placement-result` | SERVICE | bruger beder om resultat på mail (ingen tilbud) |
| `order-confirmation` | SERVICE | første `invoice.paid` B2C (doc 07 §8.3) |
| `b2b-welcome-receipt` | SERVICE | første `invoice.paid` B2B |
| `trial-onboarding-d0/d3/d7` | SERVICE | B2B trial (§5) |
| `trial-ending-d11/d13` | SERVICE | B2B trial (§5) |
| `trial-ended` | SERVICE | `paused` |
| `payment-failed`, `payment-failed-reminder`, `payment-action-required`, `access-ending` | SERVICE | dunning (doc 07 §9) |
| `cancellation-confirmed` | SERVICE | opsigelse |
| `withdrawal-receipt`, `withdrawal-completed` | SERVICE | fortrydelse (doc 07 §8.5–8.6) |
| `renewal-notice-annual` | SERVICE | B2C årsplan før fornyelse |
| `monthly-training-d1/d14/d25` | SERVICE | månedlig træning |
| `certificate-issued` | SERVICE | certifikat |
| `admin-weekly-report` | SERVICE | mandag |
| `support-escalation-receipt`, `support-reply` | SERVICE | support (doc 08) |
| `security-alert` | SERVICE | ny login-metode, email ændret |
| `owner-digest` | SERVICE (internt) | dagligt til Marco |
| `nurture-1..4` | MARKETING | lead nurture |
| `abandoned-checkout-1` | MARKETING | forladt checkout |
| `winback-1/2` | MARKETING | win-back |
| `newsletter` | MARKETING | månedligt, manuelt godkendt |
| `promo` | MARKETING | kampagne (§7) |

Templates i React Email, dansk tekst via i18n-nøgler, plain-text-version genereres. Ingen tracking-pixel i SERVICE-mails (`[JURA: verificeres]` — cookie/ePrivacy for åbningssporing i marketing; MVP: kun klik-tracking via egne redirect-links, ingen pixel).

## 4. Frekvensgrænser (MARKETING)
- Maks **2 marketingmails pr. 7 dage** og **6 pr. 30 dage** pr. modtager (alle flows tilsammen).
- Maks 1 flow aktivt ad gangen pr. modtager (prioritet: abandoned > nurture > win-back > newsletter).
- Stilletid 20:00–08:00 og søn-/helligdage → udsættes.
- Bliver modtageren betalende kunde → alle salgsflows stoppes straks (event `billing/subscription.activated`).
- SERVICE: træningspåmindelser maks 3/md (d1/d14/d25) — kan slås fra i indstillinger.

## 5. Automatiske flows (Inngest)

Alle flows: `step.sleepUntil` + re-check af betingelser ved hvert trin (samtykke, kundestatus, flowets stopbetingelse). Flow-id som idempotensnøgle `flow:{flow}:{subject}:{step}`.

| Flow | Kategori | Trigger | Timing | Stop når |
|---|---|---|---|---|
| **Lead nurture** | MARKETING | `PlacementResult` oprettet **og** `ConsentRecord(MARKETING_EMAIL)=CONFIRMED` | `nurture-1` +1 t efter bekræftelse (personlig styrke/svaghed fra test, 1 gratis modul-link) · `nurture-2` dag 3 (case fra rolle) · `nurture-3` dag 7 (hvad virksomheder får: rapport, art. 4-budskab "dokumenteret, rollebaseret tiltag") · `nurture-4` dag 14 (evt. reelt tilbud efter §7) | køb, afmelding, bounce |
| **Uden samtykke** | — | `PlacementResult` uden samtykke | **Ingen mails.** Kun `placement-result` hvis brugeren selv beder om at få resultatet tilsendt (SERVICE, intet salg). | — |
| **B2B trial-onboarding** | SERVICE | `trialing` startet | d0 kom-i-gang (invitér kolleger, første modul) · d3 "Sådan ser du status" · d7 status for teamet (antal startet/bestået) | trial slut |
| **B2B trial ending** | SERVICE | trial `trialEnd` | d11 + d13 (+ `trial_will_end`-webhook som sikkerhedsnet, dedup): faktuel info: dato for udløb, hvad der sker (læseadgang), pris pr. bruger fra config, hvordan man fortsætter. **Ingen rabat, ingen nedtæller.** | konverteret |
| **Forladt checkout** | MARKETING | `checkout.session.expired` el. ingen `completed` 60 min efter oprettelse **og** `CONFIRMED` samtykke | 1 mail efter 4 t (påmindelse + link). Ingen rabat i denne mail. | køb, afmelding |
| **Månedlig træning** | SERVICE | `MonthlyCycle` åbnet for bruger | d1 "Din månedspakke er klar (≈ 15 min)" · d14 hvis ikke gennemført · d25 hvis ikke gennemført. Indhold: modultitler, tid, link. Aldrig tilbud. | pakke gennemført, påmindelser slået fra, ikke længere aktivt seat |
| **Fælles startdato** (§ 10b) | SERVICE | `Organization.programStartsAt` nået | 1 mail på dagen til medlemmer: "I dag starter I" + link til planen. Aldrig tilbud. | — |
| **Streak, genopfriskningsspørgsmål, tjek-ind** (§ 10b) | — | — | **Ingen mails i MVP** — vises kun i appen og i månedspakkens eksisterende mails. | — |
| **Win-back** | MARKETING | abonnement `canceled` (ikke fortrudt) **og** `CONFIRMED` samtykke | `winback-1` +30 dage (hvad er nyt: 3 NEWS-modultitler) · `winback-2` +60 dage (evt. reelt tilbud §7) | genkøb, afmelding |
| **Admin ugerapport** | SERVICE | mandag 07:30 til OWNER/ADMIN | aktive/inaktive, beståede moduler, certifikater, månedspakke-gennemførelse. **Ingen prompt-tekster, ingen individuel "overvågnings"-rangering**; individuel status kun som i admin-UI. Kan slås fra. | — |
| **Nyhedsbrev** | MARKETING | manuelt (Marco godkender kladde) | maks 1/md | — |

B2B-kontaktpersoner (admins) modtager kun MARKETING hvis de selv har givet samtykke — ingen "firma-samtykke".

## 6. B2B outreach
- **Kolde emails: ikke tilladt** — heller ikke til virksomheder eller generiske adresser (info@). Gælder også LinkedIn InMail-automatik (ikke tilladt; se §9).
- **Telefon:** Marco må ringe B2B. Ved opkald: oplys om frameldingsret; respektér **Robinsonlisten for enkeltpersoner** (enkeltmandsvirksomheder/personligt ejede firmaer). Opkald til forbrugere er forbudt (forbrugeraftaleloven § 4).
- Admin-værktøj `/admin/outreach` (simpel liste: virksomhed, CVR, kontakt, telefon, status, "ønsker ikke kontakt"-flag, Robinson-tjek-dato) — ingen auto-dialer, ingen mail-afsendelse herfra. `[JURA: verificeres — Robinson-opslag via CPR-registeret/leverandør]`.
- Efter et opkald må der ikke sendes marketingmail. Marco henviser til hjemmesiden (tilmelding/prøveperiode), eller — hvis kontakten selv beder om det — sender en konkret svarmail/mødeinvitation (svar på anmodning, intet uopfordret tilbud). Marketing kræver samtykke via vores formular (§2).

## 7. Rabatter og kampagner

Kun via **Stripe promotion codes** oprettet af `scripts/create-promo.ts` (eller admin-UI), som håndhæver:
- `expires_at` påkrævet og **≤ 10 dage** fra start, ELLER en annonceret slutdato (stadig `expires_at` = slutdatoen) — aldrig længere end halvdelen af perioden med normalpris (validering mod config `normalPriceSince`).
- **Reel førpris:** "før"-prisen = aktuel Stripe Price, som har været gældende i perioden før (check: Price uændret ≥ 30 dage `[JURA: verificeres — præcis periode]`). Ingen opfundne "vejl. priser".
- Kampagnetekst genereres fra kode-objektet (procent/beløb, slutdato i dansk format, betingelser: "gælder første N måneder, derefter 49 kr/md") — ikke fritekst.
- **Ingen nulstillende nedtællere.** Nedtæller må kun vises hvis den regner mod den faste `expires_at` (serverbaseret), og samme slutdato for alle.
- Ingen "kun i dag", ingen falsk knaphed.
- Introduktionstilbud tilladt hvis tydeligt mærket "Introduktionstilbud" med slutdato.
- `AuditLog(action=PROMO_CREATED)` med alle parametre. Promo-koder vises aldrig i SERVICE-mails eller support.

## 8. Leveringsdygtighed
- Domæner: `mail.greb.dk` (SERVICE, Resend) og `news.greb.dk` (MARKETING, Resend, separat domæne/reputation). Domæne ikke tjekket (beslutningslog) — placeholder `greb.dk`.
- **SPF** (Resend-include), **DKIM** (Resend-nøgler pr. subdomæne), **DMARC** start `p=none; rua=mailto:dmarc@…` → `p=quarantine` efter 4 uger uden fejl → `p=reject`.
- Return-path/bounce-domæne pr. subdomæne. `List-Unsubscribe` + one-click på marketing (Gmail/Yahoo-krav til bulk-afsendere).
- Opvarmning: marketing starter med < 200/dag, fordobling pr. uge.
- Overvågning: bounce > 2 % eller klager > 0,1 % → automatisk pause af MARKETING (`MARKETING_EMAIL_ENABLED=false`) + alarm.
- Ingen købte/importerede lister nogensinde (`source: ADMIN_IMPORT_FORBIDDEN` findes kun for at afvise import i kode).

## 9. Betalt annoncering — automatisering

Kode: `src/server/ads/` + Inngest cron. Styrer **kun MindForwards egne konti**: Google Ads API (developer token + OAuth for egen konto) og Meta Marketing API (System User-token for egen Business Manager). LinkedIn: ingen API-automatisering i MVP (Ads API kræver godkendelse `[U]`); **aldrig automatiserede LinkedIn-beskeder eller scraping**.

**Hårdt månedsloft 20.000 kr** (`ADS_MONTHLY_CAP_DKK=20000`, config; håndhævet i kode):
- Hver time: hent faktisk forbrug (Google `metrics.cost_micros`, Meta `spend`) for indeværende kalendermåned → `projected = spent + Σ(aktive dagsbudgetter × resterende dage)`.
- Ingen kampagne/ad set kan aktiveres eller få budget hævet, hvis `projected > cap`.
- `spent ≥ 90 %` af cap → nedskalér dagsbudgetter forholdsmæssigt. `spent ≥ 100 %` (inkl. 5 % margin for platformsforsinkelse: stop ved 95 %) → **pause alle kampagner** på begge platforme + straks-alarm. Platform-side kontoloft (Google account budget / Meta account spending limit) sættes også til 20.000 kr som sekundært værn.
- Fordeling i config (`ADS_ALLOCATION`: fx Google 50 %, Meta 50 %).

**Kill-regler** (dagligt 06:00, config-tærskler):
- Ad set/annoncegruppe med **CPL > `ADS_MAX_CPL_DKK`** (lead = `PlacementResult` med marketing-samtykke, attribueret via UTM/klik-id, server-side konvertering) efter ≥ `ADS_MIN_SPEND_FOR_DECISION_DKK` (fx 2× max-CPL) → pause.
- CTR < 0,5 % efter 2.000 visninger → pause.
- 0 leads efter 3× max-CPL forbrug → pause.
- Automatikken må **pause og sænke** — aldrig oprette nye kampagner, ændre målretning eller skrive annoncetekst. Skalering op (maks +20 %/dag) kun for ad sets med CPL < 50 % af max og kun inden for loftet. Nye annoncer/tekster: Marco (tekster skal overholde §7 og AI-forordnings-budskabet i `docs/10-compliance.md` §5).
- Alle ændringer → `AuditLog(action=ADS_CHANGE, platform, objectId, before, after, rule)`.
- Kill switch `ADS_AUTOMATION_ENABLED`.

**Ugerapport til Marco** (mandag 08:00, SERVICE internt): forbrug vs. loft, leads, CPL pr. platform/ad set, test→betalende, CAC, pausede ad sets + regel, top-3 annoncer, anbefalinger (kun forslag).

**Sporing:** PostHog EU (cookieless/consent-styret `[JURA: verificeres — cookiesamtykke for annonce-pixels]`). Meta Pixel/Google tag kun efter cookiesamtykke; server-side Conversions API/Enhanced Conversions kun med hashed email fra brugere der har givet samtykke til markedsføring/annoncesporing.

## 10. Metrics
Pr. flow: sendt, leveret, klik, afmeldinger, bounces, klager, konvertering (test → samtykke → bekræftet → betalende). Samtykkerate på resultatside (mål ~40 % kontakt iflg. benchmark), double opt-in-bekræftelsesrate, SERVICE-påmindelse → gennemført månedspakke, ads: CPC, CPL, CAC, forbrug/loft. Dashboard i `/admin/marketing`.
