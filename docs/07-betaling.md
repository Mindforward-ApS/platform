# 07 — Betaling (Stripe), moms, forbrugerflows

> Kanonisk: `docs/00-beslutninger.md` §5 + §10 (priser, ingen Stripe Tax i MVP, MobilePay, EAN fase 2). Fakta/lov: `docs/research-fund.md`. Lovhenvisninger ud over dem dér er markeret `[JURA: verificeres]`.
> Entiteter (§9): `Organization` (BUSINESS|PERSONAL), `Membership`, `Subscription` (spejler Stripe), `ConsentRecord`, `EmailMessage`, `AuditLog`, `Escalation`. Felter: `docs/03-datamodel.md` / `prisma/schema.prisma`.
> Kode: `src/server/billing/`. Webhook: `src/app/api/webhooks/stripe/route.ts`.

## 1. Grundregler

1. **Stripe-webhooks er eneste sandhed for abonnementsstatus.** Appen skriver aldrig `Subscription.status` ud fra klientens redirect.
2. **Én Stripe Customer og højst ét aktivt abonnement pr. `Organization`** (unik `Subscription.organizationId`). B2B = én samlet betaling pr. virksomhed; medarbejdere betaler aldrig selv.
3. **Priser hardkodes aldrig** — de kommer fra plan-config + Stripe Price-objekter (§2).
4. Kun kort via Stripe. **MobilePay via Stripe understøtter ikke tilbagevendende betalinger** → ikke tilbudt i MVP (research-fund: Betaling).
5. **Ingen Stripe Tax i MVP.** Dansk moms beregnes af appen og påføres som manuelle Stripe Tax Rates (gratis, ikke Stripe Tax-produktet) — §5.
6. Stripe API-version pinnes i `src/server/billing/stripe.ts` (`apiVersion`). Verificér felter (fx placering af `current_period_end` på subscription items i nyere versioner) mod den pinnede version før kode.

## 2. Planer (config, ikke kode)

`src/lib/config/plans.ts` (Zod-valideret ved opstart). Beløb vises altid fra Stripe Price (cache 1 t) og krydstjekkes mod `expectedUnitAmountOre` ved opstart (mismatch → Sentry-fejl + deploy-check fejler).

```ts
export const plans = [
  { key: "FREE",           audience: "PERSONAL", stripePriceEnv: null,                       interval: null,    taxMode: null },
  { key: "B2C_MONTHLY",    audience: "PERSONAL", stripePriceEnv: "STRIPE_PRICE_B2C_MONTHLY", interval: "month", taxMode: "INCLUSIVE", expectedUnitAmountOre: 4900 },  // 49 kr inkl. moms
  { key: "B2C_ANNUAL",     audience: "PERSONAL", stripePriceEnv: "STRIPE_PRICE_B2C_ANNUAL",  interval: "year",  taxMode: "INCLUSIVE", expectedUnitAmountOre: 49000 }, // 490 kr inkl. moms
  { key: "B2B_MONTHLY",    audience: "BUSINESS", stripePriceEnv: "STRIPE_PRICE_B2B_MONTHLY", interval: "month", taxMode: "EXCLUSIVE", expectedUnitAmountOre: 4900,  minSeats: 5 }, // 49 kr/bruger ex. moms
  { key: "B2B_ANNUAL",     audience: "BUSINESS", stripePriceEnv: "STRIPE_PRICE_B2B_ANNUAL",  interval: "year",  taxMode: "EXCLUSIVE", expectedUnitAmountOre: 49000, minSeats: 5 }, // 490 kr/bruger/år ex. moms
] as const;

export const billingRules = {
  b2bMinSeats: 5,
  b2bTrialDays: 14,
  b2bTrialMaxUsers: 5,
  b2cFreeModules: 3,               // + niveautest
  withdrawalDays: 14,
  pastDueGraceDays: 14,
  readOnlyRetentionDaysAfterCancel: 90, // B2B-admin kan eksportere rapporter/certifikater
};
```

- Stripe Products: `Greb Personlig`, `Greb Virksomhed`. Prices: `currency: "dkk"`, `recurring.interval`, B2B med `usage_type: "licensed"` (quantity = seats). `tax_behavior` på Price sættes som `inclusive` (B2C) / `exclusive` (B2B).
- **Prisændring = ny Stripe Price + env/config-ændring.** Eksisterende abonnenter flyttes kun efter varsel `[JURA: verificeres — varslingsfrist for prisændring på løbende forbrugeraftaler]`.
- Rabat/kampagne: kun Stripe promotion codes efter reglerne i `docs/09-email-og-marketing.md` §7.

## 3. Entitlements

`getEntitlements(organizationId)` i `src/server/billing/entitlements.ts` — eneste sted adgang afgøres. Kaldes fra authz-laget; cachet pr. request.

| Kilde → | Adgang |
|---|---|
| Ingen `Subscription`, `type=PERSONAL` | `FREE`: niveautest + første `b2cFreeModules` moduler i planen; ingen månedspakke, intet certifikat |
| `trialing` (B2B) | Fuld adgang, maks `b2bTrialMaxUsers` aktive `Membership`, virksomhedsrapport med vandmærke "Prøveperiode" |
| `active` | Fuld adgang; B2B: aktive learner-memberships ≤ `quantity` |
| `past_due` | Fuld adgang i `pastDueGraceDays` + banner til OWNER/ADMIN/B2C-bruger (SERVICE-mail, §9) |
| `paused` (trial udløbet uden kort) | B2B `READ_ONLY`: admin ser status/rapporter, learners ser "Jeres prøveperiode er slut" |
| `canceled`, `unpaid`, `incomplete_expired` | B2C → `FREE`. B2B → `READ_ONLY` i `readOnlyRetentionDaysAfterCancel`, derefter sletning efter `docs/10-compliance.md` §1.4 |
| Fortrudt (§8.6) | Straks → `FREE` |

Entitlement-struktur: `{ planKey, modules: "FREE_LIMITED" | "FULL", seatLimit, monthlyCycle, certificates, companyReport, readOnly }`. Unit tests dækker hver række (krav i `CLAUDE.md`).

## 4. Checkout

### 4.1 B2C (forbruger) — eget checkout-UI
Stripes hostede Checkout-knap kan ikke hedde "Køb", og vi skal have to afkrydsningsfelter + fed pris lige over knappen. Derfor: **Checkout Sessions API med indlejret, egen-styret UI** (Stripe "Elements with Checkout Sessions API", `ui_mode: "custom"` — verificér aktuelt parameternavn) — Payment Element + vores egen knap, der kalder `checkout.confirm()`.

Server action `createB2CCheckout({ planKey })`:
```ts
stripe.checkout.sessions.create({
  mode: "subscription",
  ui_mode: "custom",                          // verificér
  customer: org.stripeCustomerId ?? undefined, // opret Customer først med preferred_locales: ["da"], metadata.organizationId
  line_items: [{ price: env[plan.stripePriceEnv], quantity: 1, tax_rates: [TAX_RATE_DK_25_INCLUSIVE] }],
  billing_address_collection: "required",
  locale: "da",
  metadata: { organizationId, planKey, consentTextVersion },
  subscription_data: { metadata: { organizationId, planKey } },
  return_url: `${APP_URL}/konto/betaling/tak?session_id={CHECKOUT_SESSION_ID}`,
}, { idempotencyKey: `checkout:${organizationId}:${planKey}:${attemptNonce}` });
```
Blokér oprettelse hvis org allerede har `Subscription` med status ∈ {active, trialing, past_due, paused}.

### 4.2 B2B (virksomhed)
B2B er ikke omfattet af forbrugerreglerne, men bruger samme komponent for ensartethed (knaptekst "Køb" er også fin her).
- Forudsætninger (formular før betaling): firmanavn, **CVR** (8 cifre; opslag i CVR-register for at forudfylde navn/adresse — leverandør verificeres, fx Virk/CVR-API), fakturaadresse, faktura-email, valgfri reference/PO-nr., valgfrit **EAN** (13 cifre, GLN-kontrolciffer valideres; gemmes til fase 2, §11).
- Stripe Customer: `name`, `address`, `email` (faktura-email), `tax_id_data: [{ type: "eu_vat", value: "DK" + cvr }]` `[verificér tax-id-type for DK]`, `invoice_settings.custom_fields: [{ name: "CVR", value }, { name: "Reference", value }]`, `metadata: { organizationId, cvr, ean }`.
- `line_items: [{ price, quantity: seats, adjustable_quantity: { enabled: true, minimum: 5, maximum: 500 }, tax_rates: [TAX_RATE_DK_25_EXCLUSIVE] }]`. Server validerer `seats ≥ 5` uanset UI.
- **MVP: kun danske virksomheder** (`address.country = "DK"`). Andre lande → "Kontakt os" (eskalation). EU-virksomheder med omvendt betalingspligt: fase 2 (§5).

### 4.3 Seats og proration
- Seat-ændring kun i appen (OWNER/ADMIN): `src/server/billing/seats.ts`.
  - **Op:** `subscriptions.update(id, { items: [{ id: itemId, quantity }], proration_behavior: "always_invoice" })` → forholdsmæssig opkrævning straks.
  - **Ned:** tidligst ved periodens udløb (Subscription Schedule eller `pending` ændring i appen anvendt ved `invoice.upcoming`), aldrig under 5 og aldrig under antal aktive learners. Ingen kreditering midt i perioden.
- Invitationer blokeres når aktive + ventende invitationer ≥ `quantity` (venlig besked med "Tilføj pladser"-knap til OWNER/ADMIN).
- Alle seat-ændringer → `AuditLog`.

### 4.4 Customer Portal
Konfigureres via API ved deploy (`src/server/billing/portal-config.ts`, idempotent): dansk sprog, tilladt: betalingskort, fakturaer/kvitteringer, faktureringsadresse, momsnummer, **opsigelse ved periodens udløb**. Ikke tilladt: planskift og antal seats (sker i appen pga. min. 5 og membership-tjek). Ingen "fastholdelsestilbud" i opsigelsesflowet. Link genereres pr. klik (`billingPortal.sessions.create`), aldrig gemt.

## 5. Moms (beregnet i appen, MVP)

`src/server/billing/tax.ts` → `resolveTaxTreatment(org, billingAddress)`:

| Kunde | MVP-behandling | Stripe Tax Rate |
|---|---|---|
| Forbruger, DK | 25 % dansk moms, inkluderet i prisen | `TAX_RATE_DK_25_INCLUSIVE` (`percentage: 25, inclusive: true, country: "DK", display_name: "Moms"`) |
| Virksomhed, DK | 25 % lagt oveni | `TAX_RATE_DK_25_EXCLUSIVE` |
| Forbruger i andet EU-land | Ikke åbnet i MVP | — |
| Virksomhed i andet EU-land | Ikke åbnet i MVP (fase 2: omvendt betalingspligt, VIES-verificeret momsnummer) | — |
| Uden for EU | Ikke åbnet i MVP | — |

- Tax Rate-id'er i env; oprettes af `scripts/stripe-setup.ts` (idempotent: søg på `metadata.key`).
- Visningspriser: B2C "49 kr/md inkl. moms"; B2B "49 kr pr. bruger/md ekskl. moms (61,25 kr inkl. moms)". Beløb formateres med `Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" })` ud fra Stripe Price, ikke fra tekstkonstanter.
- **Fase 2 (noteret, ikke bygget):** EU-forbrugere: dansk moms så længe samlet EU-B2C-salg < €10.000/år, derover kundens lands moms via OSS (research-fund). Byg tæller + alarm ved 80 % før EU-B2C åbnes. EU-virksomheder: omvendt betalingspligt, verificér momsnummer. Alternativ: slå Stripe Tax til (0,5 %) når EU-salg åbnes.

## 6. B2B-prøveperiode (14 dage, uden kort, ≤ 5 brugere)

1. OWNER opretter `Organization(type=BUSINESS)` med CVR (formular §4.2, EAN valgfrit). Ét trial pr. CVR (unik check) og pr. verificeret domæne.
2. Server: opret Stripe Customer + Subscription uden betalingsmetode:
   ```ts
   stripe.subscriptions.create({
     customer, items: [{ price: B2B_MONTHLY, quantity: 5, tax_rates: [TAX_RATE_DK_25_EXCLUSIVE] }],
     trial_period_days: 14,
     payment_settings: { save_default_payment_method: "on_subscription" },
     trial_settings: { end_behavior: { missing_payment_method: "pause" } },
     metadata: { organizationId, planKey: "B2B_MONTHLY", trial: "true" },
   }, { idempotencyKey: `trial:${organizationId}` });
   ```
3. Status `trialing` via webhook → entitlements. Maks 5 aktive brugere (invitationer blokeres derover).
4. Konvertering ("Fortsæt med Greb"): vælg måned/år + antal seats (≥ 5) → Checkout `mode: "setup"` for kort → webhook `checkout.session.completed` → sæt default payment method → `subscriptions.update` (pris/quantity, `trial_end: "now"` hvis kunden vil starte straks; ellers kører trial til udløb).
5. Udløb uden kort → `paused` → `READ_ONLY`. Kort tilføjet senere → `subscriptions.resume(id, { billing_cycle_anchor: "now" })` `[verificér]`.
6. Trial-mails (SERVICE, ingen tilbud): se `docs/09-email-og-marketing.md` §5 (onboarding dag 0/3/7, "prøveperiode slutter" dag 11 og 13 via `customer.subscription.trial_will_end` + egen tidsplan).

## 7. B2C gratis niveau
Ingen Stripe-objekter. `FREE` = niveautest + første 3 moduler i personlig plan. Opgradering → §4.1. Ingen gratis prøveperiode på betalt plan for forbrugere i MVP (undgår krav om prøveperiode-oplysninger, research-fund: "Gratis prøveperiode"). Indføres en senere: vis rigtig pris efter prøven, betalingsfrekvens og automatisk fortsættelse direkte i flowet.

## 8. Forbrugerflow (B2C) — præcist efter research-fund.md

### 8.1 Checkout-side (`/konto/opgrader`)
Rækkefølge på siden, oppefra:
1. Planvalg (måned/år).
2. Oplysninger før køb (forbrugeraftaleloven § 12 iflg. research-fund): hvad man køber, at abonnementet **fornyes automatisk** hver måned/år indtil opsigelse, at det kan opsiges i appen når som helst med virkning fra periodens udløb, link til handelsbetingelser og privatlivspolitik.
3. Payment Element (kortoplysninger, faktureringsadresse).
4. To **ikke-forudafkrydsede** checkbokse (begge påkrævet for straks-adgang; teksterne versioneres i `content/legal/checkout-consent.v1.json`, endelig ordlyd `[JURA: verificeres]`):
   - ☐ "Jeg ønsker adgang til Greb med det samme, inden fortrydelsesfristen på 14 dage er udløbet."
   - ☐ "Jeg er indforstået med, at min fortrydelsesret bortfalder, når adgangen er begyndt."
   (Om Greb er "digitalt indhold" eller "tjenesteydelse" er uafklaret → advokat; teksten tilpasses efter svaret. Fortrydelsesknappen §8.4 vises uanset.)
5. **Med fed, lige over knappen:** "49 kr pr. md. inkl. moms" (årlig: "490 kr pr. år inkl. moms") + linje "Fornyes automatisk. Opsig når som helst." Beløb fra Stripe Price.
6. Knap med teksten **"Køb"** (ingen anden tekst på knappen). Knappen er deaktiveret til begge checkbokse er sat; klientside + serverside validering.

### 8.2 Ved klik på "Køb"
1. Server action gemmer **før** betaling: `ConsentRecord` × 2 (`purpose: IMMEDIATE_ACCESS_REQUEST` og `WITHDRAWAL_LOSS_ACK`, `textVersion`, fuld tekst-hash, tidspunkt UTC, IP, user-agent, `organizationId`, `userId`, `checkoutSessionId`). `ConsentRecord` bruges også til marketing (doc 09) — `purpose`-enum skal dække begge (C's datamodel).
2. `checkout.confirm()`; 3-D Secure håndteres af Stripe.
3. Adgang tildeles først når webhook `checkout.session.completed` + `customer.subscription.created` (status `active`) er behandlet. Tak-siden poller `/api/billing/status` (maks 30 s) og viser "Vi bekræfter din betaling …" imens.

### 8.3 Ordrebekræftelse (varigt medium)
SERVICE-mail `order-confirmation` (Resend), sendes på `invoice.paid` for første faktura, idempotensnøgle `stripe:{invoiceId}:order-confirmation`. Indhold:
- Sælgers navn, CVR, adresse, email (fra config `legalEntity`).
- Produkt, plan, pris inkl. moms, betalingsfrekvens, automatisk fornyelse, startdato.
- Ordret tekst + tidspunkt for de to samtykker (fra `ConsentRecord`).
- Fortrydelsesinformation + link til "Fortryd aftale" (dyb link) + standardfortrydelsesformular `[JURA: verificeres — krav til standardformular]`.
- Sådan opsiger du (link).
- **Handelsbetingelser som PDF-vedhæftning** (versionsnummer i filnavn) — varigt medium; link alene er ikke nok.
- Ingen tilbud, ingen upsell (SERVICE).
Stripe sender desuden faktura/kvittering (`preferred_locales: ["da"]`).

### 8.4 "Fortryd aftale"-knap (§ 20 a, i kraft 19. juni 2026)
- Knap med teksten **"Fortryd aftale"** synlig i hele fortrydelsesperioden: fra købstidspunkt til købstidspunkt + 14 dage (beregnet i Europe/Copenhagen, til udgangen af dag 14 `[JURA: verificeres — fristberegning]`).
- Placering: (a) `/konto/abonnement` øverst, (b) fast link i app-footer for brugere med aftale i fortrydelsesperioden, (c) offentlig side `/fortryd-aftale` (virker uden login), (d) link i ordrebekræftelsen.
- Gælder også B2C-annuel plan. Ikke vist for B2B.

### 8.5 Formular → "Bekræft fortrydelse"
- Felter: **navn**, **hvilken aftale** (logget ind: forudvalgt dropdown med plan + købsdato; offentlig: fritekst + købsdato), **email** (forudfyldt hvis logget ind).
- Knap **"Bekræft fortrydelse"**.
- Ved klik: opret withdrawal-registrering (`AuditLog(action=CONTRACT_WITHDRAWAL_REQUESTED)` med payload: navn, aftale, email, tidspunkt UTC, IP, user-agent, kanal) — datamodel-felt/-tabel afklares med C (`docs/OPEN-QUESTIONS.md`), ingen ny entitet opfindes her.
- **Kvittering straks**: (1) kvitteringsside med dato og klokkeslæt (Europe/Copenhagen), (2) SERVICE-mail `withdrawal-receipt` til den angivne email (varigt medium) med dato/tid, hvilken aftale, og hvad der sker nu.
- Offentlig formular: matches automatisk på email + aftale; ingen match → `Escalation(reason=WITHDRAWAL_UNMATCHED)`; kvittering sendes alligevel (vi bekræfter modtagelse, ikke gennemførelse).

### 8.6 Behandling og refusion
Inngest-funktion `billing/withdrawal.process` (idempotent på withdrawal-id):
1. `subscriptions.cancel(id, { prorate: false, invoice_now: false })` — straks.
2. **Fuld refusion** af betalingen i fortrydelsesperioden: credit note med refusion (`creditNotes.create({ invoice, refund_amount, reason: "order_change" })` eller `refunds.create` + credit note — verificér) → bogføring får modpost.
   - Forretningsbeslutning MVP: fuld refusion uanset digitalt indhold/tjenesteydelse (lavt beløb, lav juridisk risiko). Misbrugsværn: maks én fuld refusion pr. person/kort-fingerprint; derefter `Escalation` til Marco. Evt. forholdsmæssig betaling for leveret tjenesteydelse `[JURA: verificeres]`.
   - Refusion til samme betalingsmiddel, straks og senest inden for lovens frist `[JURA: verificeres — refusionsfrist]`.
3. Entitlements → `FREE` straks; data bevares (brugeren kan fortsætte gratis).
4. SERVICE-mail `withdrawal-completed` (refunderet beløb, forventet tid på kontoudtog).
5. `AuditLog` + linje i daglig digest.
Supportagenten refunderer aldrig — den henviser til "Fortryd aftale"-knappen eller eskalerer (`docs/08-support.md`).

### 8.7 Opsigelse i appen (§ 28 a)
- `/konto/abonnement` → knap **"Opsig abonnement"** → én bekræftelsesside ("Dit abonnement stopper [dato]. Du har adgang indtil da.") → **"Bekræft opsigelse"**. Ikke flere trin end tilmelding. Ingen tilbud/fastholdelse i flowet.
- `subscriptions.update(id, { cancel_at_period_end: true })` → SERVICE-mail `cancellation-confirmed` med slutdato.
- "Genoptag" muligt indtil slutdato.
- B2B: kun OWNER; samme flow; gemmer `READ_ONLY`-periode.
- **B2C (00-beslutninger § 10, 13. okt 2026):** ingen binding, intet varsel — opsig fra dag til dag; adgang resten af den betalte løbende måned, ingen refusion for påbegyndt måned. Opfylder § 28 (maks. 1 md. varsel efter 5 mdr.). B2C-årsplan: åben (OPEN-QUESTIONS).

## 9. Dunning (mislykkede betalinger)
- Stripe Smart Retries slået til; retry-vindue 14 dage; derefter abonnement → `canceled` (Stripe Billing-indstilling, dokumentér i `scripts/stripe-setup.md`).
- Stripes egne "failed payment"-mails **slået fra**; vi sender danske SERVICE-mails via Resend:
  - `invoice.payment_failed` (forsøg 1) → `payment-failed` til B2C-bruger / B2B OWNER+faktura-email med Customer Portal-knap.
  - Dag 7 → påmindelse. Dag 12 → "Adgang stopper om 2 dage".
  - `invoice.payment_action_required` (3DS) → `payment-action-required` med hosted invoice-link.
- In-app banner under `past_due`. Ingen tilbud i disse mails.

## 10. Webhooks

Endpoint `POST /api/webhooks/stripe`: rå body, `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` før alt andet → ellers 400. Svar 200 hurtigt; tungt arbejde i Inngest (`stripe/event.received` med `id: event.id` som Inngest-idempotensnøgle).

**Idempotens-princip (ingen ny tabel):** handlers er *state-baserede*: de henter altid det aktuelle objekt fra Stripe (`subscriptions.retrieve`) og upserter spejlet i `Subscription` → rækkefølge og gentagelser er ligegyldige. Sideeffekter (emails) har idempotensnøgle `stripe:{objectId}:{template}` med unik constraint på `EmailMessage.idempotencyKey`.

| Event | Handling |
|---|---|
| `checkout.session.completed` | mode=subscription: link Customer↔Organization, sync subscription. mode=setup: sæt default payment method, fortsæt trial-konvertering (§6.4) |
| `checkout.session.expired` | Marker forladt checkout. Trigger abandoned-flow **kun** hvis gyldigt marketing-`ConsentRecord` (doc 09 §5) |
| `customer.subscription.created` / `.updated` | Sync spejl (status, planKey, priceId, quantity, periode, cancelAtPeriodEnd, trialEnd); `AuditLog` ved status/quantity-ændring |
| `customer.subscription.deleted` | Sync → `canceled`; entitlements nedgraderes; SERVICE-mail hvis ikke allerede sendt (opsigelse/fortrydelse) |
| `customer.subscription.trial_will_end` | B2B: SERVICE-mail "Prøveperioden slutter om 3 dage" |
| `customer.subscription.paused` / `.resumed` | Sync; READ_ONLY til/fra |
| `invoice.paid` | Sync; første faktura → ordrebekræftelse (B2C) / velkomst-kvittering (B2B); fornyelse → ingen ekstra mail (Stripe-kvittering) |
| `invoice.payment_failed` | Sync (`past_due`); dunning-mail |
| `invoice.payment_action_required` | 3DS-mail |
| `invoice.upcoming` | Anvend planlagt seat-nedjustering (§4.3); B2C årsplan: SERVICE-mail om kommende fornyelse `[JURA: verificeres — krav om fornyelsesvarsel]` |
| `charge.refunded` | `AuditLog`; marker withdrawal/refund som gennemført |
| `charge.dispute.created` | `Escalation(priority=HIGH)` + straks-alarm til Marco |
| `customer.updated`, `customer.tax_id.created/updated` | Sync faktura-felter til `Organization` |

Ukendte events: log + 200. Fejl i handler: Inngest retry (5 forsøg, backoff) → Sentry.

## 11. Fakturaer og B2B-felter
- Stripe-faktura: firmanavn, adresse, CVR (custom field + tax id), reference/PO, linje "Greb Virksomhed — N brugere × 49 kr" (fra Price), moms 25 % særskilt, fortløbende nummerering via Stripe-kontoens fakturaprefix `GREB-` `[JURA: verificeres — fakturakrav i momsbekendtgørelsen]`.
- Sælgeroplysninger (navn, CVR, adresse) i Stripe-kontoens public business details + config `legalEntity`.
- **EAN gemmes** på `Organization` (og Customer metadata), men bruges ikke i MVP. Stripe-fakturaer er ikke e-fakturaer → offentlige kunder (EAN/Nemhandel) faktureres i **fase 2 via e-conomic API (`sendBy: "ean"`)**. MVP: offentlige kunder → "Kontakt os" → manuel håndtering.
- Faktura-email kan være en anden end OWNER's login-email.

## 12. Gebyrer (research-fund, stripe.com/dk/pricing)

EØS-kort **1,5 % + 1,80 kr** pr. transaktion; **Billing 0,7 %** af faktureret beløb; (Stripe Tax 0,5 % — ikke brugt i MVP).

| Transaktion (opkrævet beløb) | Kortgebyr | Billing | I alt | Andel |
|---|---|---|---|---|
| B2C måned 49 kr | 2,54 kr | 0,34 kr | ~2,88 kr | ~5,9 % |
| B2C år 490 kr | 9,15 kr | 3,43 kr | ~12,58 kr | ~2,6 % |
| B2B 5 brugere/md (245 + moms = 306,25 kr) | 6,39 kr | 2,14 kr | ~8,54 kr | ~2,8 % |
| B2B 20 brugere/år (9.800 + moms = 12.250 kr) | 185,55 kr | 85,75 kr | ~271 kr | ~2,2 % |

Beregnes på beløb inkl. moms (det er det, der trækkes). Konsekvens: årsplan og flere seats er markant billigere at opkræve — fremhæv årsplan i UI (uden vildledning). Ikke-EØS-kort koster mere (se Stripe).

## 13. Bogføring
- ApS skal bruge registreret digitalt bogføringssystem → **e-conomic**.
- Stripe → e-conomic via **Pairy** (fra 149 kr/md) eller **Integrationspartner** (199 kr/md/modul) — vælg én ved launch (OPEN-QUESTIONS). Bogfører salg, moms, gebyrer, refusioner, udbetalinger.
- Appen sender ikke selv posteringer til e-conomic i MVP. Fase 2: e-conomic API kun til EAN-fakturaer.
- Månedlig afstemning (Marco, 15 min): Stripe-udbetalinger = e-conomic bank; refusioner har credit notes.

## 14. Sikkerhed
- Secret key kun server. Restricted key til scripts. Webhook-secret pr. miljø.
- Server actions tjekker rolle: kun OWNER (B2B) / ejer af PERSONAL-org må købe, ændre seats, opsige, fortryde.
- `organizationId` tages aldrig fra klienten ved webhooks — kun fra Stripe metadata + Customer-link i DB.
- Rate limit på checkout-oprettelse (5/time/org) og offentlig fortrydelsesformular (10/time/IP + Turnstile-lignende bot-værn uden at blokere legitime brugere `[verificér løsning]`).

## 15. Testplan

**Unit (Vitest, før kode):** plan-config parse + Price-mismatch; `resolveTaxTreatment`; entitlements-matrix (§3); seat-regler (min 5, ned ved periodeslut, invitation-blokering); fortrydelsesvindue (grænser: 14 dage − 1 min / + 1 min, sommertid); idempotent sync (samme event 2×, events i omvendt rækkefølge).

**Stripe CLI (lokalt + CI mod testmode):**
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # sæt STRIPE_WEBHOOK_SECRET fra output
pnpm tsx scripts/stripe-setup.ts                                 # products, prices, tax rates, portal-config (idempotent)
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.trial_will_end
stripe trigger charge.dispute.created
stripe events resend <evt_id>                                     # idempotens: ingen dobbelt-mail
```
**Test clocks** (`stripe test_helpers test_clocks create --frozen-time …`, Customer oprettet med `test_clock`): B2B trial → dag 11/14 uden kort → `paused`; tilføj kort → `resume`; månedlig fornyelse; dunning over 14 dage → `canceled`; årsplan-fornyelse.

**Testkort:** `4242 4242 4242 4242` (OK), `4000 0025 0000 3155` (3DS), `4000 0000 0000 0341` (kan gemmes, opkrævning fejler → dunning), `4000 0000 0000 9995` (afvist).

**E2E (Playwright, testmode):**
1. B2C: opgrader → "Køb"-knap deaktiveret uden checkbokse → fed pris over knap findes (assert DOM-rækkefølge) → køb → adgang → ordrebekræftelse i mail-mock med samtykketekster + PDF.
2. "Fortryd aftale" synlig dag 0 og dag 13, ikke dag 15 (test clock) → formular → "Bekræft fortrydelse" → kvittering med tidspunkt → refusion + `FREE`.
3. Offentlig `/fortryd-aftale` uden login → kvittering → match.
4. Opsigelse i ≤ 2 klik → `cancel_at_period_end` → genoptag.
5. B2B: trial uden kort → 6. invitation blokeres → konvertering med 7 seats → seat op (proration-faktura) → seat ned planlagt.
6. Webhook med ugyldig signatur → 400, ingen DB-ændring.
