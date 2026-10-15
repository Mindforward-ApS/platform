# Launch gate — status (M10, 13. okt 2026)

> Kilder: `docs/11-roadmap.md` (Launch gate, minimum) + `docs/10-compliance.md` § 9 (autoritativ).
> **Ingen produktion med rigtige kunder og ingen live-betalinger, før alle punkter er ✅.**
> Status: ✅ opfyldt (bevis angivet) · 🟡 delvist / bygget, men kræver verifikation i produktion · ⬜ åben.
> Ejer: **Marco** (beslutning/konto/drift), **Advokat** (juridisk gennemgang), **Kode** (Claude Code / milestone).
> Status for M7/M8/M9-punkter er "afventer merge" — de bygges parallelt og skal genbekræftes på `integration`.

## A. Jura (docs/10 § 9 + docs/11)
| # | Punkt | Status | Bevis / note | Ejer |
|---|---|---|---|---|
| J1 | Advokatgennemgang: digitalt indhold vs. tjenesteydelse, handelsbetingelser (forbruger + virksomhed), UI/varemærker (skins, produktnavne, disclaimer) | ⬜ | `docs/OPEN-QUESTIONS.md` "Til Marco / advokat" | Advokat + Marco |
| J2 | Advokat godkendt: samtykke-/erkendelsestekster ved checkout, fortrydelsesflow + refusionspraksis, marketing-samtykketekst, DPA-udfyldning, AI-forordnings-budskaber | ⬜ | tekster i `content/legal/` (checkout-consent.v1, marketing-consent.v1) | Advokat |
| J3 | Alle `[JURA: verificeres]` i docs 06–10 afklaret eller bevidst udskudt i OPEN-QUESTIONS | ⬜ | grep `JURA:` i docs/ | Marco + Advokat |
| J4 | Varemærke-/domænetjek af produktnavnet (Mindforward; .com/.eu bruges af andre) — DKPTO/EUIPO | ⬜ | 00 § 10b; domæne mindforward.dk købt | Marco |
| J5 | Databehandleraftale-skabelon (Datatilsynets skabelon) til B2B, privatlivspolitik, cookiepolitik offentliggjort | 🟡 | sider findes som markerede udkast (M5: `/privatliv`, `/cookies`, `/handelsbetingelser`); DPA-tekst + accept-flow i M7 | Advokat (tekst) · Kode M7 (flow) |
| J6 | Underdatabehandlere listet med region (tabel nedenfor) + overførselsgrundlag verificeret pr. leverandør | 🟡 | offentlig `/underdatabehandlere` bygget fra `content/legal/subprocessors.json` (test `tests/unit/subprocessors.test.ts`, axe-dækket); alle rækker står "Under verificering" indtil regioner/DPF/SCC er tjekket i hver konsol → sæt `verified: true` | Marco (verificér DPF/SCC + regioner) · Kode (side) |
| J7 | Ingen "AI Act-certificering"/"lovkrav"/bødetrusler i UI, mails, landingsside, rapporter (tekstgennemgang) | 🟡 | tests: `tests/unit/support-help.test.ts` (hjælpeartikler), `tests/unit/email.test.ts` (SERVICE-scan), support-output-guard `src/server/support/guard.ts`; fuld manuel gennemgang af landingsside/rapport mangler | Marco |
| J8 | Juridiske sider (§ 8) publiceret med version og dato | 🟡 | M5-udkast med version/dato og udkast-banner; endelig tekst afventer J1/J2 | Advokat + Marco |

## B. Produkt / kode
| # | Punkt | Status | Bevis / note | Ejer |
|---|---|---|---|---|
| P1 | e2e grøn: B2C-køb (fed pris, "Køb", checkbokse), "Fortryd aftale" → kvittering → refusion, opsigelse ≤ 2 klik | ✅ | `tests/e2e/billing.spec.ts` (fake Stripe) — 20/20 e2e grønne i M10-miljøet | Kode |
| P2 | e2e: B2B-trial → konvertering, DPA-accept før invitation, invitér medarbejder | ⬜ | M7 (afventer merge) | Kode M7 |
| P3 | Signup, gennemfør modul | ✅ | `tests/e2e/auth.spec.ts`, `tests/e2e/module-player.spec.ts` | Kode |
| P4 | Consent-gate unit tests; SERVICE-template-scan; banned-claims-scan på content/, i18n, templates | 🟡 | `tests/unit/consent-gate.test.ts`, `tests/unit/email.test.ts` ✅; fælles banned-claims-scan (`src/server/content-engine/banned-claims.ts`) kommer i M9 | Kode M9 |
| P5 | Admin kan ikke se prompt-tekster (test); retention-job kører (prompts 30 dage) | 🟡 | global Prisma `omit` + `tests/integration/retention-purge-prompt-text.test.ts` ✅; admin-endpoint-test i M7; **verificér i produktion** (Inngest-kørsel) | Kode M7 · Marco |
| P6 | PII-filter verificeret i produktion | 🟡 | sandkasse (M3) + support-maskering `src/server/support/pii-mask.ts`, eval `cpr-shared`; verificér på prod | Marco |
| P7 | Eksport og sletning virker end-to-end | ⬜ | M7 (`gdpr.erase-user`, `/api/me/export`) | Kode M7 |
| P8 | Disclaimer + "Øvemodel" i alle skins; ingen leverandør-assets i repo | ✅ | `tests/unit/sandbox-compliance.test.ts`, `tests/e2e/sandbox.spec.ts` | Kode |
| P9 | axe: 0 serious/critical | ✅ | `tests/e2e/accessibility.spec.ts` (axe WCAG 2.1 AA): 12 offentlige + 11 indloggede skærme, 0 serious/critical (2026-10-15) | Kode |
| P10 | 2FA på alle interne admin-konti | 🟡 | `requirePlatformAdmin` kræver TOTP (M1, `tests/integration/two-factor.test.ts`); Marcos konto skal enrolles i prod | Marco |
| P11 | Secrets roteret fra udvikling; backups testet | ⬜ | se D3 | Marco |
| P12 | Support-evals ≥ 90 %, 100 % på kritiske | 🟡 | 36/36 grønne med mocket (adversarielt) model: `tests/integration/support-evals.test.ts`; kørsel mod rigtig model (`pnpm eval:support`, budget 20 kr) er ikke bygget | Kode + Marco (API-nøgle) |
| P13 | Budgetlofter aktive: AI (80 %-alarm præcis én gang/md, 95 % degraderet, 100 % blokeret), indholdsmotor, ads 20.000 kr | 🟡 | `tests/integration/ai-budget-watch.test.ts`, `tests/unit/ai-global-budget.test.ts`, per-bruger-loft ✅; indholdsmotorens delbudget = M9; **ads-loft: ikke relevant — annonceautomatik er fase 2 (00 § 10a)** | Kode M9 · Marco |
| P14 | AI-forbrugsgrænser også sat i Anthropic-konsollen | ⬜ | konsol-indstilling | Marco |
| P15 | Supportagent + hjælpecenter + eskalering + daglig digest | ✅ | `src/server/support/`, `/konto/support`, `/hjaelp`, `tests/e2e/support.spec.ts`, `tests/integration/support-digest-purge.test.ts` | Kode |
| P16 | PostHog sætter ingen analyse-cookies før samtykke | ✅ | `tests/e2e/analytics.spec.ts` (cookies + local/sessionStorage asserted) | Kode |
| P17 | Sentry-alarm ved fejlrate-spike; uptime-check på kritiske routes | 🟡 | koden sender; regler + uptime-checks skal oprettes jf. `docs/runbooks/observability.md` | Marco |
| P18 | Neon backup/restore testet; Sentry + digest modtages | ⬜ | restore-øvelse; sæt `OWNER_DIGEST_EMAIL`, `SENTRY_DSN` i prod | Marco |
| P19 | Marco har godkendt endeligt design for alle offentlige skærme | ⬜ | 00 § 10c: designsessioner efter første gennemkørsel | Marco |
| P20 | Sikkerhedsgennemgang af koden + ekstern pentest før første betalende kunde | 🟡 | intern gennemgang 2026-10-15 (commit 05dcc44): open redirect via `?next=` lukket (`src/lib/safe-next.ts`), sandbox-ejer kræver aktivt medlemskab, Better Auth org-endpoints slået fra, GDPR-eksport/sletning dækker connector-, deling- og overførselsdata; ekstern pentest mangler | Kode ✅ · Marco (pentest) |

## C. Drift / bogføring
| # | Punkt | Status | Note | Ejer |
|---|---|---|---|---|
| D1 | e-conomic + Pairy/Integrationspartner koblet til Stripe; testafstemning af én måned | ⬜ | | Marco |
| D2 | Stripe-konto: dansk sælgerinfo, fakturaprefix, Smart Retries, Stripes egne fejl-mails fra, Customer Portal-config | ⬜ | `STRIPE_PORTAL_CONFIGURATION_ID` | Marco |
| D3 | Stripe live-mode, kvitteringer, Customer Portal og "Fortryd aftale" testet med rigtigt kort og refunderet | ⬜ | | Marco |
| D4 | SPF/DKIM/DMARC på `mail.` og `news.`; `List-Unsubscribe` testet | ⬜ | Resend-domæner (eu-west-1) | Marco |
| D5 | Underdatabehandler-liste og overførselsgrundlag verificeret | ⬜ | = J6 | Marco |
| D6 | Hændelsesplan `docs/legal/incident-runbook.md` (72 t til Datatilsynet) + DPIA-note | 🟡 | udkast skrevet: `docs/legal/incident-runbook.md` (forløb 0–72 t, roller, kundebesked, brudlog); `[JURA]`-punkter + DPIA-note mangler | Marco + Advokat |

## D. Underdatabehandlere (til `/underdatabehandlere`; regioner skal verificeres af Marco i hver konsol)
| Leverandør | Formål | Data | Region / lokation | Overførselsgrundlag | Status |
|---|---|---|---|---|---|
| Vercel | Hosting, serverless functions | alle request-data, logs ≤ 30 d | functions `fra1` (Frankfurt); edge/CDN globalt | EU-US DPF + SCC `[verificér]` | 🟡 `vercel.json regions: ["fra1"]` |
| Neon | Postgres-database | alle app-data | AWS `eu-central-1` (Frankfurt) | EU-hosting; DPA `[verificér]` | 🟡 |
| Anthropic | LLM: sandkasse, bedømmelse, support, indholdsmotor | prompts/svar (PII-filtreret), ingen navne/emails i system-prompt | USA (API) `[verificér EU-behandling / ZDR]` | DPF/SCC `[verificér]`; API-data ikke til træning `[verificér vilkår]` | ⬜ |
| Stripe | Betaling, fakturaer, Customer Portal | navn, email, betalingsdata | EU-enhed (Irland) + USA | DPF + SCC `[verificér]` | ⬜ |
| Resend | Transaktions- og marketingmail | email, mailindhold | `eu-west-1` (Irland) sending-domæne | DPA + SCC `[verificér]` | ⬜ |
| Inngest | Baggrundsjobs/cron | job-payloads (ids, ingen prompt-tekst) | USA `[verificér region]` | DPF/SCC `[verificér]` | ⬜ |
| PostHog | Produktanalyse (kun efter samtykke persistent) | pseudonym user-id, events uden PII | EU Cloud (Frankfurt) — host `eu.i.posthog.com` | EU-hosting; DPA | 🟡 |
| Sentry | Fejl og cron monitors | stacktraces uden PII/body/cookies | EU-region (`*.ingest.de.sentry.io`) `[verificér projekt]` | DPA + SCC `[verificér]` | 🟡 |
| GitHub | Indholdsmotorens issues (M9) | ingen persondata | USA | ikke persondata | ⬜ |
| e-conomic + Pairy/Integrationspartner | Bogføring | fakturaoplysninger | DK/EU `[verificér]` | DPA `[verificér]` | ⬜ |

## E. Åbne punkter fra M10 (kode)
- Offentlig kontaktformular på `/hjaelp` → `Escalation` (docs/08 § 1) er ikke bygget; artiklen `kontakt` henviser til supportchatten.
- `/admin/support/:id` (svar på eskalationer) og `/admin/digest/:date` er admin-UI (M7-området); mail-links peger dertil.
- Regrade-job for `PENDING` skriveopgaver efter budgetpause: brugeren kan indsende igen; automatisk regrade mangler.
- Rigtig-model-eval-runner (`pnpm eval:support`) mod `tests/evals/support/cases.ts`.
