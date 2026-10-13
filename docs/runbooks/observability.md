# Runbook — observability, alarmer og uptime (M10)

> Kanonisk: `docs/02-arkitektur.md` § 6 (budget), § 8 (observability). Alt herunder er konfiguration i
> tredjepartsværktøjer, som Marco opretter én gang. Koden sender data; reglerne lever i Sentry/uptime-værktøjet.

## 1. Sentry (EU-region, projekt `greb`)

Koden: `src/sentry.server.config.ts`, `src/instrumentation-client.ts` (ingen PII: `dataCollection` slået fra,
`beforeSend` fjerner user/body/cookies/query). Cron Monitors sendes automatisk af job-wrapperen
`src/server/jobs/monitor.ts` (heartbeat-check-in efter hver vellykket kørsel; `error` efter sidste retry;
monitor-konfigurationen upsertes ved første check-in, så monitorerne opstår af sig selv).

### 1.1 Alarmregler (opret i Sentry → Alerts)
| # | Navn | Type | Betingelse | Handling |
|---|---|---|---|---|
| A1 | Fejlrate-spike | Metric alert, `event.type:error`, environment `production` | antal fejl > 3× gennemsnit for samme time sidste 7 dage OG ≥ 20 fejl/10 min | mail til Marco (+ evt. push) |
| A2 | Ny fejltype | Issue alert | "A new issue is created" i `production` | mail, maks. 1/time pr. issue |
| A3 | Fejl i betaling | Issue alert | tag `transaction` matcher `/api/webhooks/stripe` eller logger `billing.*` | mail straks |
| A4 | Crash-free sessions | Metric alert | crash-free sessions < 99 % over 1 time | mail |
| A5 | AI-budget | Issue alert | message starter med `AI budget` (sendes af `ai.budget-watch` ved 80 % = warning, 100 % = error) | mail straks |
| A6 | Cron monitors | Cron monitor alert (automatisk pr. monitor) | missed check-in eller `error` | mail straks |

Cron Monitors (slug · schedule Europe/Copenhagen · max runtime):
- `ai-budget-watch` · `5 * * * *` · 10 min
- `digest-owner-daily` · `0 7 * * *` · 10 min
- `retention-purge-misc` · `45 3 * * *` · 20 min

Ældre daglige jobs (`retention.purge-prompt-text`, `sandbox.expire-sessions`, `consent.expire-unconfirmed`)
kan få samme wrapper ved næste ændring (de er ejet af M3–M5); indtil da dækkes de af A2.

### 1.2 Verifikation
1. `ENABLE_DEBUG_ROUTES=1` på preview → `GET /api/debug/sentry` → fejl i Sentry inden for 1 min.
2. Inngest dashboard → kør `ai.budget-watch` manuelt → check-in "ok" under Crons.

## 2. Uptime-checks (ekstern, fx Better Stack / UptimeRobot, EU-region, interval 1 min)
| Check | URL | Forventet | Alarm |
|---|---|---|---|
| U1 | `https://mindforward.dk/` | 200, indeholder "Mindforward" | 2 fejl i træk |
| U2 | `https://mindforward.dk/api/health` | 200, JSON `status: "ok"`, `db: "ok"` | 2 fejl i træk (503 = DB nede) |
| U3 | `https://mindforward.dk/log-ind` | 200 | 2 fejl i træk |
| U4 | `https://mindforward.dk/koeb` | 200 eller 307 (redirect til login) | 2 fejl i træk |
| U5 | `https://mindforward.dk/hjaelp` | 200 | 3 fejl i træk |

`/api/health` returnerer `{ status, db, dbLatencyMs, app, appVersion, version (commit), region, time }` og
`Cache-Control: no-store`. Den er offentlig og afslører ingen data.

## 3. PostHog EU Cloud
- Host: `https://eu.i.posthog.com` (EU-ingestion). Projektindstillinger: **"Discard client IP data" = til**,
  session replay **fra**, autocapture **fra**, surveys **fra**, data retention efter behov.
- Klient (`src/components/analytics/posthog-analytics.tsx`) indlæses kun når `NEXT_PUBLIC_POSTHOG_KEY` er sat.
  Før samtykke: `persistence: "memory"` + `disable_persistence` (ingen cookies, ingen local/sessionStorage —
  e2e `tests/e2e/analytics.spec.ts`). Efter "Accepter statistik": `localStorage+cookie`. Tilbagetrækning
  ("Kun nødvendige") sletter PostHogs lagrede data.
- Server (`src/server/observability/posthog.ts`): taksonomi-events fra docs/02 § 8 med whitelist af
  properties; `distinct_id` = intern `user.id`; aldrig email/navn/prompt-tekst.

## 4. AI-budget (docs/02 § 6)
| Niveau | Hvad sker der | Hvor |
|---|---|---|
| ≥ 80 % (`AI_BUDGET_ALERT_PCT`) | Én mail til `OWNER_DIGEST_EMAIL` + Sentry warning pr. måned (CAS på `BudgetMonth.alert80SentAt`) | `src/server/ai/budget-watch.ts` |
| ≥ 95 % | `FeatureFlag AI_DEGRADED_MODE` (source budget-watch) + `degradedAt`; chat maxTokens 400, historik 6 ture; indholdsmotorens draft/verify pauser | gateway + job |
| 100 % | Nye AI-kald blokeres (`AiCall.status = BLOCKED_GLOBAL_CAP`); sandkassen viser "Øvemodellen holder pause …"; PROMPT_TASK → `PENDING` (deterministiske checks kører); support → hjælpecenter-søgning + "skriv menneske"; anden mail + Sentry error | `src/server/ai/gateway.ts` |
| Ny måned | Flaget slås fra igen af jobbet (kun hvis jobbet selv satte det) | job |

Oversigt: `/admin/forbrug` (GREB_ADMIN + 2FA). Sæt også et hårdt månedsloft i Anthropic-konsollen
(launch gate).

## 5. Daglig digest
`digest.owner-daily` kl. 07:00 → `OWNER_DIGEST_EMAIL`: åbne eskalationer efter SLA (overskredne markeret),
support i går, betaling, indholdsmotor (når M9 skriver `PipelineRun`), fejl (AI/mail/webhooks), AI-forbrug,
ændrede kill switches. Tomme sektioner udelades.

## 6. Hændelser
- DB nede (U2 503): tjek Neon status → Vercel logs (`health.db_failed`).
- AI-fejlrate: Vercel logs `ai.failed`/`ai.retry`; slå `AI_ENABLED` FeatureFlag fra ved vedvarende fejl.
- Persondatabrud: `docs/legal/incident-runbook.md` (åben — se launch gate).
