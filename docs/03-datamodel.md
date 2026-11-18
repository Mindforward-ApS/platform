# 03 — Datamodel

> Kilde til sandhed for felter: `prisma/schema.prisma`. Entitetsnavne: `docs/00-beslutninger.md` § 9 (Prisma ejer navnene). Denne fil forklarer formål, relationer, indekser, opbevaring og hvornår hver entitet introduceres (milestones fra `docs/11-roadmap.md`).

## 0. Konventioner

- Tabeller i snake_case via `@@map`; kolonner i camelCase (Better Auth læser Prisma-feltnavne).
- Id'er: `cuid()` for egne tabeller; auth-/org-tabeller får id fra Better Auth (`@id` uden default).
- `createdAt`/`updatedAt` på alle muterbare tabeller; append-only tabeller (events, logs) har kun `createdAt`.
- **Org-scoping:** alle org-ejede rækker har `organizationId`; queries går gennem `forOrg(orgId)` (`docs/02-arkitektur.md` § 7).
- Penge: priser i heltal-øre (`unitAmountOre`); AI-/indholdsomkostning som `Decimal(12,4)` DKK. Aldrig `Float` til penge.
- **Fritekst fra lærere** findes kun i tre felter: `StepResult.promptText`, `StepResult.aiFeedback`, `SandboxEvent.contentText`. Global `omit` i Prisma-klienten; kun ejeren kan læse dem; slettes efter 30 dage. Alle andre JSON-felter (`answer`, `payload`, `rubricScores`) må ikke indeholde fritekst (Zod håndhæver).
- **Admins ser aldrig prompt-tekst** — hverken i dashboard, rapport, CSV, support-værktøjer eller `AuditLog.metadata`.

## 1. Oversigt

| Område | Entiteter | Milestone |
|---|---|---|
| Auth | `User`, `Session`, `Account`, `Verification`, `TwoFactor`, `RateLimit` | M1 |
| Organisation | `Organization`, `Membership`, `Invitation` | M1 (link/domæne-felter brugt i M7) |
| Pensum | `Track`, `Module`, `ModuleVersion` | M2 |
| Læring | `TrackEnrollment`, `PlacementResult`, `Assignment`, `Attempt`, `StepResult` | M4–M5 (`TrackEnrollment` M2) |
| Certifikat | `Certificate` | M7 |
| Månedlig | `MonthlyCycle`, `MonthlyAssignment` | M8 |
| Vane og overførsel (§ 15) | `WeeklyActivity`, `ReviewItem`, `UsageCheckIn` | M8 |
| Team (§ 15, kun BUSINESS) | `TeamGoal`, `ContextAcknowledgement` | M7 |
| Kontekst og personalisering (§ 15) | `ContextItem`, `PersonalizedContent` | M5 (privat) / M7 (erhverv) |
| Betaling | `Plan`, `Subscription`, `WithdrawalRequest` | M2 (Plan-seed) / M6 |
| Email/samtykke | `EmailMessage`, `EmailSuppression`, `ConsentRecord` | M1 (`EmailMessage`) / M5 (`ConsentRecord`) / M8 |
| Indholdsmotor | `ContentSource`, `SourceSnapshot`, `ChangeEvent`, `PipelineRun` | M9 |
| Support | `SupportConversation`, `SupportMessage`, `Escalation` | M10 |
| Drift | `AuditLog` (M1), `SandboxSession`, `SandboxEvent` (M3), `AiCall`, `AiUsageDaily` (M3), `BudgetMonth` (M3; alarm M10), `WebhookEvent` (M6), `FeatureFlag` (M3) | — |

`TrackEnrollment`, `Plan`, `WithdrawalRequest`, `TwoFactor`, `RateLimit`, `EmailSuppression`, `AiCall`, `AiUsageDaily`, `BudgetMonth`, `WebhookEvent` og `FeatureFlag` er **tilføjet ud over § 9** fordi beslutninger i § 2–10 kræver dem (licensniveau pr. bruger, priser i DB, fortrydelses-kvittering, 2FA for admin, rate limits, bounce-håndtering, AI-lofter, webhook-idempotens, kill switches). De er ikke nye navne for eksisterende begreber. → Tilføjes til § 9 af ejeren af `00-beslutninger.md`.

## 2. Auth (Better Auth)

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `User` | Person med login | `email` (unik), `emailVerified`, `name`, `platformRole` (USER/GREB_ADMIN), `trainingRemindersEnabled`, `twoFactorEnabled`, `deletionRequestedAt` | 1-n til næsten alt | Til kontosletning. Sletning: `gdpr.erase-user` (≤ 30 dage) — cascade på læringsdata; `ConsentRecord`, `WithdrawalRequest`, `EmailMessage`, `AuditLog` får `userId = null` (bevis bevares) |
| `Session` | Login-session | `token` (unik), `expiresAt`, `ipAddress`, `userAgent`, `activeOrganizationId` | idx `userId` | Slettes ved udløb (+ job) |
| `Account` | Login-metode (Microsoft/Google/credential) | `providerId`, `accountId`, tokens | idx `userId`, `(providerId, accountId)` | Følger `User` |
| `Verification` | Magic-link-/verifikationstokens | `identifier`, `value`, `expiresAt` | idx `identifier` | Slettes efter udløb |
| `TwoFactor` | TOTP for `GREB_ADMIN` | `secret`, `backupCodes` | idx `userId` | Følger `User` |
| `RateLimit` | Tællere (Better Auth + egen limiter) | `key` (unik), `count`, `lastRequest` | — | Rulles løbende |

⚠ Feltlisterne er afstemt med Better Auths docs 12. okt 2026. I M1: kør `npx auth@latest generate` og diff — Better Auths CLI vinder for dens egne felter (TODO i skemaet).

## 3. Organisation

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `Organization` | Kunde. `BUSINESS` (seats) eller `PERSONAL` (1 seat, B2C) — samme model | `type`, `slug` (unik), `seatLimit` (= `Subscription.quantity`; prøve: 5), `stripeCustomerId` (unik), `cvr`, `vatNumber`, `ean` (fase 2), `verifiedDomain` (unik), `domainVerifiedAt`, `joinLinkTokenHash`, `dpaAcceptedAt`/`dpaVersion` (databehandleraftale), `deletedAt` | idx `type` | Soft delete → hard delete efter 30 dage; regnskabs-/forbrugerretligt bevis bevares (SetNull) |
| `Membership` | Bruger ↔ org med rolle (Better Auth `member`, omdøbt) | `role` OWNER/ADMIN/LEARNER, `jobRole` (salg, HR, økonomi …), `deactivatedAt` | unik `(organizationId, userId)`, idx `userId` | Deaktivering frigør seat; data bevares til bruger-/org-sletning |
| `Invitation` | Email-invitation | `email`, `role`, `status` (pending/accepted/rejected/canceled), `expiresAt`, `inviterId` | idx `(organizationId, status)`, `email` | Slettes 90 dage efter afslutning |

Seat-regel: aktive `Membership` (uden `deactivatedAt`) + åbne `Invitation` ≤ `Organization.seatLimit`.

## 4. Pensum

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `Track` | Spor som **data** | `key` (CHATGPT/COPILOT/CLAUDE/GEMINI), `displayName` (beskrivende), `skinKey`, `isActive` (MVP: CHATGPT+COPILOT+CLAUDE), `licenseTiers` (COPILOT: `[COPILOT_CHAT, COPILOT_M365]`) | unik `key` | Permanent |
| `Module` | Stabil identitet for et modul | `slug` (= JSON-id), `type` CORE/FEATURE/NEWS/ROLE, `jobRole`, `requiredLicense` (denormaliseret fra publiceret version), `publishedVersionId` (eneste pointer; CAS ved publicering), `isStale`, `retiringAt` | idx `(trackId, type)`; unik `publishedVersionId` | Permanent |
| `ModuleVersion` | Immutabel version (trin som JSON — ikke egen tabel) | `version`, `status` DRAFT/IN_REVIEW/PUBLISHED/ARCHIVED, `origin` MANUAL/AUTO, `content` (Json), `schemaVersion`, `maxPoints`, `estimatedMinutes`, `requiredLicense`, `featureRefs[]`, `searchText`, `contentHash`, `changeEventId`, `pipelineRunId`, `draftAttempt`, `promptVersions`, `modelIds`, `verifyReport` | unik `(moduleId, version)`, unik `(changeEventId, draftAttempt)`, idx `(status, origin)` | Permanent (`Attempt` refererer → gamle scores forbliver gyldige) |

`requiredLicense` (`LicenseTier`): `null` = intet særligt krav; `COPILOT_CHAT` = virker med gratis Copilot Chat; `COPILOT_M365` = kræver betalt licens; `UNKNOWN` = "Tjek jeres licens". Svarer til modul-JSON-feltet `requiresTier` i `content/schema/module.schema.json` (B) — loaderen mapper. Funktionsnavne (Skills, Agent Builder, Gems …) står kun i `content`/`featureRefs`, aldrig som enums.

## 5. Læring

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `TrackEnrollment` | Brugerens valgte spor + Copilot-niveau | `licenseTier`, `level`, `active` | unik `(organizationId, userId, trackId)`, idx `(trackId, active)` | Følger `Membership` |
| `PlacementResult` | 5-min niveautest (også offentlig, før konto) | `anonymousTokenHash` (unik, offentlig test), `answers` (kun option-id'er), `scorePct`, `level`, `licenseTier`, `jobRole`, `recommendedModuleIds[]`, `testVersion`, `claimedAt` | idx `(userId, trackId, createdAt)`, `organizationId` | Anonyme, ikke-claimede: slettes efter 30 dage. Ellers som `User` |
| `Assignment` | Modul tildelt en lærer | `source` PLACEMENT/ADMIN/MONTHLY/SELF, `status`, `sortOrder`, `bestAttemptId`, `bestScorePct`, `passedAt`, `assignedById` | unik `(organizationId, userId, moduleId)`, idx `(userId, status)`, `(organizationId, status)` | Som `User` |
| `Attempt` | Ét forsøg på en `ModuleVersion` | `points`, `maxPoints`, `scorePct`, `passed`, `mustPassFailed`, `status` | idx `(userId, moduleVersionId)`, `(organizationId, completedAt)`, `assignmentId` | Som `User` |
| `StepResult` | Resultat pr. trin pr. forsøg | `stepId`, `stepType`, `points`, `hintLevelUsed` (3 → 0 point), `tryCount`, `flags` (statistik, fx hurtigt svar), `answer` (struktureret), `gradingStatus` (ERROR ≠ 0 point), `checksReport`, `rubricScores`, `rubricVersion`, `modelId`, `promptVersion`, `matchedSandboxEventId`; **fritekst:** `promptText`, `aiFeedback`, `promptTextPurgedAt` | unik `(attemptId, stepId)`, idx `createdAt` | **`promptText`/`aiFeedback` sættes til null efter 30 dage** (`retention.purge-prompt-text`); score/rubric-flag bevares |
| `Certificate` | Bestået spor-niveau | `verificationCode` (unik, offentlig `/certifikat/<code>`), `level`, `levelLabel`, `holderName` (snapshot), `licenseTier`, `moduleVersionIds[]`, `contentVersion`, `publicVerificationEnabled`, `pdfStorageKey`, `revokedAt` | unik `(userId, organizationId, trackId, level)` | Bevares til brugersletning; verifikationssiden viser kun navn, spor, niveau, dato |

Hvad org-admin ser (M7): pr. medarbejder — spor, niveau, `Assignment.status`, `bestScorePct`, `passedAt`, certifikater, månedsstatus. **Aldrig** `promptText`, `aiFeedback`, `SandboxEvent.contentText`, `rubricScores` med citater, `PlacementResult.answers`.

## 6. Månedlig træning

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `MonthlyCycle` | Månedens NEWS-pakke pr. spor | `month` ("2026-11"), `moduleIds[]`, `composedAt` | unik `(month, trackId)` | Permanent |
| `MonthlyAssignment` | Personlig pakke: NEWS filtreret på `licenseTier` + 1 genopfriskning, ≤ 15 min | `moduleIds[]`, `refresherModuleId`, `estimatedMinutes`, `status`, `reminderDay1/14/25SentAt` | unik `(cycleId, userId, organizationId)`, idx `(organizationId, status)` | 24 mdr. |

## 7. Betaling og forbrugerret

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `Plan` | DB-spejl af `src/lib/config/plans.ts` (`docs/07-betaling.md`); beløb vist til brugeren kommer fra Stripe Price, `unitAmountOre` er krydstjek | `code` (unik: B2C_MONTHLY/B2C_ANNUAL/B2B_MONTHLY/B2B_ANNUAL — `FREE` har ingen række), `audience` B2C/B2B, `interval`, `unitAmountOre` (4900), `taxBehavior` INCLUSIVE/EXCLUSIVE, `minSeats` (B2B 5), `trialDays` (B2B 14), `trialMaxSeats` (5), `stripePriceId` | — | Permanent (deaktivér, slet ikke) |
| `Subscription` | Spejl af Stripe — **kun webhook skriver** | `stripeSubscriptionId` (unik), `planKey`, `status` (Stripe 1:1), maks ét ikke-afsluttet abonnement pr. org (partiel unik index i migration), `quantity`, perioder, `trialEnd`, `cancelAtPeriodEnd`, `lastStripeEventAt`/`Id` (ude-af-rækkefølge-værn). **B2C-forbrugerfelter:** `immediateAccessConsentAt`, `withdrawalWaiverAcknowledgedAt`, `withdrawalConsentTextVersion`, `withdrawalDeadlineAt` (styrer "Fortryd aftale"-knappen), `orderConfirmationEmailMessageId` (varigt medium), `cancellationRequestedInAppAt` | idx `(organizationId, status)` | 5 år efter ophør (bogføringsloven) — persondata minimeret |
| `WithdrawalRequest` | "Fortryd aftale" (§ 20 a). **Løser åbent punkt i `docs/07-betaling.md` § 8.5** — brug denne tabel (+ `AuditLog(CONTRACT_WITHDRAWAL_REQUESTED)`) | `name`, `email`, `agreementReference`, **`submittedAt`** (kvitteringstidspunkt), `ip`, `userAgent`, `status`, `receiptEmailMessageId`, `receiptSentAt`, `refundAmountOre`, `stripeRefundId` | idx `organizationId`, `(status, submittedAt)` | 5 år (bevis) |

## 8. Email og samtykke

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring |
|---|---|---|---|---|
| `ConsentRecord` | **Append-only** bevis for samtykke: marketing (MFL § 10) og B2C-checkout-erklæringer (straks-adgang + erkendelse, FAL § 18 stk. 2 nr. 13). Seneste række pr. `(subjectEmail, purpose, channel)` er gældende | `subjectEmail`, `channel` EMAIL/SMS, `purpose` MARKETING_EMAIL / IMMEDIATE_ACCESS_REQUEST / WITHDRAWAL_LOSS_ACK, **`action`** GRANTED/CONFIRMED/WITHDRAWN, `grantId` (→ GRANTED-rækken), `textVersion` + `textHash`, `source`, `ip`, `userAgent`, `checkoutSessionId`, `confirmationTokenHash` (7 dage), `confirmationSentAt`; denormaliseret på GRANTED-rækken: **`confirmedAt`** (dobbelt opt-in), **`withdrawnAt`** | idx `(subjectEmail, purpose, channel, createdAt)`, `userId`, `checkoutSessionId` | Marketing: aktivt + 5 år efter WITHDRAWN. Ubekræftede GRANTED slettes efter 30 dage. Checkout-erklæringer: 5 år |
| `EmailMessage` | Log over ALLE udgående mails | `category` SERVICE/MARKETING, `template` + `templateVersion`, `toEmail`, `consentRecordId` (**påkrævet i kode for MARKETING**), `idempotencyKey` (unik), `resendId`, `status`, `sentAt`/`deliveredAt` | idx `(userId, category)`, `(status, createdAt)` | 24 mdr.; kvitteringer/ordrebekræftelser 5 år |
| `EmailSuppression` | Suppression-liste (afmeldt, hård bounce, klage, manuel) | `emailHash` (unik; sha256 + pepper), `reason`, `appliesToService` | — | Permanent (kun hash) |

Samtykke-gate (`src/server/email/send.ts`, `docs/09-email-og-marketing.md` § 2.1): MARKETING kræver at **seneste** `ConsentRecord` for `(subjectEmail, MARKETING_EMAIL, EMAIL)` har `action = CONFIRMED`, og at der ingen `EmailSuppression` er — tjekkes ved afsendelse, ikke ved planlægning. Rækker opdateres aldrig undtagen de denormaliserede `confirmedAt`/`withdrawnAt` på GRANTED-rækken.

## 9. Indholdsmotor (detaljer: `docs/06-indholdsmotor.md`)

| Entitet | Formål | Nøglefelter | Indekser | Opbevaring |
|---|---|---|---|---|
| `ContentSource` | Officiel kilde pr. spor | `key`, `url`, `parserType`, `parserVersion`, `fetchMode`, `status` ACTIVE/DEGRADED/MANUAL_ONLY, `enabled` (kill switch), `autoPublishAllowed`, `etag`, `lastModified`, `attribution` | unik `key` | Permanent |
| `SourceSnapshot` | Hentet version | `contentHash`, `raw` (gzip), `entries` (Json), `origin` FETCH/BROWSER/MANUAL_PASTE, `httpStatus` | unik `(sourceId, contentHash)`, idx `(sourceId, fetchedAt)` | `raw` 90 dage; `entries` så længe et publiceret modul citerer |
| `ChangeEvent` | Ny/ændret entry | `entryKey`, `entryHash`, `kind` BASELINE/ADDED/MODIFIED, `status`, `classification`, `relevance`, `affectedModuleIds[]`, `githubIssueUrl` | unik `(sourceId, entryKey, entryHash)`, idx `status` | 24 mdr. (refereret: permanent) |
| `PipelineRun` | Log pr. kørsel | `kind`, `idempotencyKey` (unik), `status`, `steps`, `tokensIn/Out`, `costDkk`, `promptVersions`, `modelIds`, `verifyReport`, `error` | idx `(kind, startedAt)` | 24 mdr. |

## 10. Support

| Entitet | Formål | Nøglefelter | Indekser | Opbevaring |
|---|---|---|---|---|
| `SupportConversation` | Samtale med supportagent (brugerens egen) | `status`, `promptVersion`, `modelId`, `lastMessageAt` | idx `(userId, lastMessageAt)`, `organizationId` | 12 mdr. |
| `SupportMessage` | Besked/værktøjskald | `role`, `content`, `toolName`, `toolInput`, `toolResult` | idx `(conversationId, createdAt)` | `content` 12 mdr. (kan indeholde persondata; PII-filter advarer) |
| `Escalation` | Til support-indbakke + daglig digest | `reason` (enum afstemt med `docs/08-support.md` + `WITHDRAWAL_UNMATCHED` fra 07), `priority` LOW/NORMAL/HIGH, `summary`, `status`, `resolvedById`, `digestIncludedAt` | idx `(status, priority, createdAt)` | 24 mdr. |

Supportagentens værktøjer er org- og bruger-scopede og kan ikke læse prompt-tekster (Prisma `omit`).

## 11. Sandkasse (detaljer: `docs/04-sandkasse.md`)

| Entitet | Formål | Nøglefelter | Indekser | Opbevaring |
|---|---|---|---|---|
| `SandboxSession` | Én øvesession (seed-verden + overlay-state) | `trackId`, `skinKey`, `worldVersion`, `moduleVersionId`, `sceneId`, `attemptId`, `state` (Json overlay), `nextSeq`, `status`, `expiresAt` | idx `(userId, status)`, `attemptId`, `organizationId` | Lukkes efter 7 dages inaktivitet; slettes 30 dage efter lukning (events med `matchedSandboxEventId` bevares som bevis indtil attempt slettes) |
| `SandboxEvent` | Typet event (bedømmes af `CLICK_TASK`) | `seq` (server-tildelt), `type` (`SandboxEventType`), `actor`, `target`, `payload` (Zod pr. type, **ingen fritekst**), `contentText` (fritekst, **30 dage**), `stepId` | unik `(sessionId, seq)`, idx `(sessionId, type)`, `(organizationId, createdAt)`, `createdAt` | `contentText` → null efter 30 dage; øvrigt følger session |

## 12. Drift

| Entitet | Formål | Nøglefelter | Indekser | Opbevaring |
|---|---|---|---|---|
| `AuditLog` | Hvem gjorde hvad | `actorType`, `actorUserId`, `action` (typet union), `targetType`/`targetId`, `metadata` (aldrig prompt-tekst/secrets), `ip` | idx `(organizationId, createdAt)`, `(action, createdAt)`, `(targetType, targetId)` | 5 år |
| `AiCall` | Ét LLM-kald (uden tekst) | `feature`, `model`, `promptKey`, `promptVersion`, tokens (inkl. cache read/write), `costDkk`, `latencyMs`, `status` | idx `createdAt`, `(feature, createdAt)`, `(organizationId, createdAt)` | 13 mdr. |
| `AiUsageDaily` | Dagligt loft pr. bruger (København-døgn) | `day` (Date), tokens, `callCount`, `costDkk` | unik `(userId, day)` | 13 mdr. |
| `BudgetMonth` | Månedsloft pr. scope (GLOBAL_AI, CONTENT_ENGINE, MARKETING_ADS) | `limitDkk`, `spentDkk`, `alert80SentAt` (præcis én alarm), `alert100SentAt`, `degradedAt` | unik `(scope, month)` | Permanent |
| `WebhookEvent` | Idempotens for Stripe/Resend | `provider`, `externalId`, `status`, `payload` | unik `(provider, externalId)` | `payload` 30 dage; række 13 mdr. |
| `FeatureFlag` | Kill switches/flags (cache ≤ 60 s) | `key`, `enabled`, `value` | unik `key` | Permanent; ændringer i `AuditLog` |

## 13. Sletning og opbevaring — samlet

| Data | Regel | Job |
|---|---|---|
| Prompt-tekst (`StepResult.promptText`, `aiFeedback`, `SandboxEvent.contentText`) | null efter **30 dage**; score bevares | `retention.purge-prompt-text` (dagligt 03:30) |
| Anonym niveautest (ikke claimet) | slet efter 30 dage | `retention.purge-misc` |
| Ubekræftet samtykke | slet efter 30 dage | `consent.expire-unconfirmed` |
| `SourceSnapshot.raw` | 90 dage | `retention.purge-misc` |
| `WebhookEvent.payload` | 30 dage | `retention.purge-misc` |
| Bruger slettet | cascade læringsdata; bevis-tabeller SetNull | `gdpr.erase-user` |
| Org slettet | soft delete → hard delete efter 30 dage | `gdpr.erase-user` (org-variant) |
| Backups | roteres efter 35 dage | GitHub Action |

Retention-test (M4): rækker ældre end 30 dage mister fritekst, scores er uændrede, og ingen admin-endpoint returnerer tekst.

## 14. Enums (oversigt)

`OrganizationType`, `MembershipRole`, `PlatformRole`, `JobRole`, `TrackKey`, `LicenseTier`, `ModuleType`, `ModuleVersionStatus`, `ModuleOrigin`, `StepType`, `AssignmentSource`, `AssignmentStatus`, `AttemptStatus`, `GradingStatus`, `MonthlyAssignmentStatus`, `PlanAudience`, `BillingInterval`, `TaxBehavior`, `SubscriptionStatus`, `WithdrawalStatus`, `ParserType`, `FetchMode`, `SourceStatus`, `SnapshotOrigin`, `ChangeKind`, `ChangeEventStatus`, `PipelineRunKind`, `PipelineRunStatus`, `ConsentChannel`, `ConsentPurpose`, `ConsentAction`, `ConsentSource`, `SuppressionReason`, `EmailCategory`, `EmailStatus`, `SupportConversationStatus`, `SupportMessageRole`, `EscalationReason`, `EscalationPriority`, `EscalationStatus`, `ActorType`, `SandboxSessionStatus`, `SandboxEventType`, `AiFeature`, `AiCallStatus`, `BudgetScope`, `WebhookProvider`, `WebhookStatus`. Værdier: se skemaet. `Invitation.status` er bevidst `String` (Better Auth skriver små bogstaver).
Tilføjes med § 15: `PlacementKind`, `MinutesSavedBucket`, `TeamGoalMetric`, `ContextKind`, `PersonalizedContentKind`, `ModuleArea`; `AiFeature` får værdien `PERSONALIZATION`.

## 15. Tilføjelser fra beslutning § 10b og § 10c (18. nov 2026)

Tilføjes `prisma/schema.prisma` i **M2** (skemaet er ikke ændret endnu). Alle er org-scopede og følger brugerens/organisationens sletning. Fritekst findes kun i `ContextItem.body` og `PersonalizedContent.text` (ejerens egne oplysninger — ikke prompt-tekster).

| Entitet | Formål | Nøglefelter | Relationer / indekser | Opbevaring | Bruges fra |
|---|---|---|---|---|---|
| `WeeklyActivity` | Grundlag for ugentlig streak | `weekStart` (mandag, København), `activityCount` | unik `(userId, organizationId, weekStart)` | Som `User` | M8 |
| `ReviewItem` | Genopfriskningsspørgsmål fra et bestået modul | `moduleId`, `moduleVersionId`, `stepId`, `round` (1 = ca. 1 uge, 2 = ca. 3 uger), `dueAt`, `answeredAt`, `correct` | idx `(userId, dueAt)`, unik `(userId, organizationId, moduleVersionId, stepId, round)` | Som `User` | M8 (oprettes ved bestået modul) |
| `UsageCheckIn` | Ugentligt tjek-ind (selvrapporteret) | `weekStart`, `usedAiAtWork` (bool), `minutesSaved` (enum: NONE/UNDER_30/FROM_30_TO_60/FROM_60_TO_120/OVER_120), valgfri `moduleId` ("fik du brugt det?") — **ingen fritekst** | unik `(userId, organizationId, weekStart)`, idx `(organizationId, weekStart)` | 24 mdr. | M8 |
| `TeamGoal` | Fælles teammål (kun BUSINESS) | `metric` (LEVEL_PASSED_PCT/MODULES_PASSED/ACTIVE_MEMBERS_PCT), `targetValue`, `level`, `trackId`, `startsAt`, `dueAt`, `achievedAt`, `createdById`, `archivedAt` | idx `(organizationId, archivedAt)`; ét aktivt pr. org (partiel unik index) | Følger org | M7 |
| `ContextItem` | Element i kontekstbiblioteket (BUSINESS: virksomhedens; PERSONAL: brugerens eget — § 10c) | `kind` (AI_POLICY/APPROVED_TOOLS/DATA_RULES/CONTACT/ABOUT_BUSINESS/ABOUT_ME/GOALS/OTHER), `title`, `body` (tekst, maks. længde i config), `linkUrl`, `fileStorageKey` (PDF), `version`, `requiresAcknowledgement` (kun BUSINESS), `usedForPersonalization` (bool; `false` for CONTACT), `publishedAt`, `archivedAt`, `updatedById` | idx `(organizationId, kind, archivedAt)` | Følger org/bruger; ejeren kan slette når som helst; gamle versioner bevares kun så længe en bekræftelse henviser til dem | M5 (privat) / M7 (erhverv) |
| `ContextAcknowledgement` | Medarbejderens bekræftelse af en version (kun BUSINESS) | `itemId`, `itemVersion`, `acknowledgedAt` | unik `(userId, itemId, itemVersion)`, idx `organizationId` | Følger `Membership` (indgår i rapport) | M7 |
| `PersonalizedContent` | Gemt personaliseret tekst (genbruges til kontekst eller modul ændres) | `kind` (MODULE_RELEVANCE/TAKEAWAY/PLAN_NOTE), `organizationId` (null = delt profil-tekst uden kontekstbibliotek), `userId` (kun privat med kontekst), `profileKey` (spor + licensniveau + jobrolle + niveau pr. område), `moduleVersionId` (null for PLAN_NOTE), `contextHash` (null uden kontekst), `text`, `modelId`, `promptVersion`, `status` (READY/FAILED) | unik `(organizationId, userId, profileKey, moduleVersionId, kind, contextHash)` | Slettes når kildekonteksten slettes/ændres, og med bruger/org | M5 |

Nye felter på eksisterende entiteter:
- `PlacementResult.kind` (`ENTRY` | `EXIT`, default `ENTRY`) + `level` bruges til sluttjek. Anonyme resultater er altid `ENTRY`.
- `TrackEnrollment.weeklyGoalModules` (nullable int) — brugerens valgte tempo; `null` = slået fra.
- `Organization.programStartsAt` (nullable) — valgfri fælles startdato (kun BUSINESS).
- Modul-JSON: valgfrit `takeaway` og påkrævet `area` (docs/05 § 10); `Module.area` denormaliseres fra publiceret version (`ModuleArea`: AI_FUNDAMENTALS/RESPONSIBLE_AI/TOOL_SKILLS).

Hvad org-admin ser af disse: `TeamGoal` og virksomhedens `ContextItem` fuldt ud; `ContextAcknowledgement` pr. medarbejder (version + dato); `PlacementResult` ENTRY/EXIT som `scorePct`/`level` pr. medarbejder (aldrig `answers`). `WeeklyActivity`, `UsageCheckIn` og `ReviewItem` **kun som samlede tal for organisationen og kun når mindst 5 personer indgår** — håndhæves i datalaget og testes (M8).

Kontekstbiblioteket læses kun af AI-featuren `PERSONALIZATION` (ny værdi i `AiFeature`) — aldrig af sandkasse-chat, bedømmelse, support eller indholdsmotor (test i M5: kun `PERSONALIZATION`-kald må indeholde `ContextItem`-indhold). `ContextItem.body` og `PersonalizedContent.text` er fritekst fra ejeren/modellen: de logges ikke, indgår ikke i `AiCall` eller `AuditLog.metadata`, og MindForwards interne admin kan ikke gennemse dem.
