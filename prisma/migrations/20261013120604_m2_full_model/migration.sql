-- CreateEnum
CREATE TYPE "TrackKey" AS ENUM ('CHATGPT', 'COPILOT', 'CLAUDE', 'GEMINI');

-- CreateEnum
CREATE TYPE "LicenseTier" AS ENUM ('COPILOT_CHAT', 'COPILOT_M365', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('CORE', 'FEATURE', 'NEWS', 'ROLE');

-- CreateEnum
CREATE TYPE "ModuleVersionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ModuleOrigin" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('READ', 'DEMO', 'CLICK_TASK', 'PROMPT_TASK', 'QUIZ', 'SPOT_ERROR', 'JUDGMENT');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('PLACEMENT', 'ADMIN', 'MONTHLY', 'SELF');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'PASSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'GRADED', 'ERROR');

-- CreateEnum
CREATE TYPE "MonthlyAssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlanAudience" AS ENUM ('B2C', 'B2B');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "TaxBehavior" AS ENUM ('INCLUSIVE', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('RECEIVED', 'RECEIPT_SENT', 'PROCESSED');

-- CreateEnum
CREATE TYPE "ParserType" AS ENUM ('HTML', 'MARKDOWN', 'JSON', 'ATOM');

-- CreateEnum
CREATE TYPE "FetchMode" AS ENUM ('DIRECT', 'BROWSER_FALLBACK');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'MANUAL_ONLY');

-- CreateEnum
CREATE TYPE "SnapshotOrigin" AS ENUM ('FETCH', 'BROWSER', 'MANUAL_PASTE');

-- CreateEnum
CREATE TYPE "ChangeKind" AS ENUM ('BASELINE', 'ADDED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "ChangeEventStatus" AS ENUM ('NEW', 'HELD', 'SKIPPED', 'CLASSIFIED', 'DRAFTED', 'IN_REVIEW', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PipelineRunKind" AS ENUM ('DAILY_SOURCE', 'FRESHNESS_AUDIT', 'RETIRE_DATE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('RUNNING', 'NO_CHANGE', 'SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED_KILL_SWITCH', 'SKIPPED_BUDGET');

-- CreateEnum
CREATE TYPE "ConsentChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('MARKETING_EMAIL', 'IMMEDIATE_ACCESS_REQUEST', 'WITHDRAWAL_LOSS_ACK');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'CONFIRMED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('PLACEMENT_RESULT', 'SIGNUP', 'ACCOUNT_SETTINGS', 'CHECKOUT', 'FOOTER_FORM', 'CONFIRMATION_LINK', 'UNSUBSCRIBE_LINK', 'EMAIL_COMPLAINT', 'SUPPORT');

-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "SupportMessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "EscalationReason" AS ENUM ('REFUND_OR_BILLING_DISPUTE', 'WITHDRAWAL_HELP', 'WITHDRAWAL_UNMATCHED', 'LEGAL_OR_PRIVACY', 'DATA_REQUEST', 'BUG', 'ACCOUNT_ACCESS', 'PRICING_OR_DISCOUNT', 'B2B_SALES', 'ANGRY_OR_COMPLAINT', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "EscalationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SandboxSessionStatus" AS ENUM ('ACTIVE', 'RESET', 'CLOSED');

-- CreateEnum
CREATE TYPE "SandboxEventType" AS ENUM ('SESSION_STARTED', 'SESSION_RESET', 'UI_CLICKED', 'UI_NAVIGATED', 'SETTING_CHANGED', 'CHAT_CONVERSATION_STARTED', 'CHAT_MESSAGE_SENT', 'CHAT_RESPONSE_RECEIVED', 'CHAT_RESPONSE_REGENERATED', 'CHAT_RESPONSE_COPIED', 'CHAT_RESPONSE_RATED', 'CHAT_FILE_ATTACHED', 'PII_WARNING_SHOWN', 'PII_BLOCKED', 'MAIL_OPENED', 'MAIL_DRAFT_SAVED', 'MAIL_SENT', 'CALENDAR_EVENT_OPENED', 'CALENDAR_EVENT_CREATED', 'FILE_OPENED', 'FILE_CREATED', 'CRM_RECORD_OPENED', 'CRM_RECORD_UPDATED', 'CRM_FILTER_APPLIED', 'SHEET_OPENED', 'SHEET_CELL_EDITED', 'ASSISTANT_CREATED', 'ASSISTANT_UPDATED', 'ASSISTANT_KNOWLEDGE_ADDED', 'ASSISTANT_USED', 'CONNECTOR_CONNECT_STARTED', 'CONNECTOR_PERMISSION_GRANTED', 'CONNECTOR_PERMISSION_DENIED', 'CONNECTOR_DISCONNECTED', 'TOOL_CALL_EXECUTED', 'AUTOMATION_CREATED', 'AUTOMATION_UPDATED', 'AUTOMATION_ENABLED', 'AUTOMATION_DISABLED', 'AUTOMATION_TEST_RUN', 'AUTOMATION_RUN_SIMULATED', 'AGENT_TASK_STARTED', 'AGENT_STEP_APPROVED', 'AGENT_STEP_REJECTED', 'AGENT_TASK_COMPLETED');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('SANDBOX_CHAT', 'SANDBOX_AGENT', 'GRADE_PROMPT_TASK', 'SUPPORT_AGENT', 'CONTENT_CLASSIFY', 'CONTENT_DRAFT', 'CONTENT_VERIFY');

-- CreateEnum
CREATE TYPE "AiCallStatus" AS ENUM ('OK', 'ERROR', 'TIMEOUT', 'FALLBACK', 'BLOCKED_USER_CAP', 'BLOCKED_GLOBAL_CAP', 'BLOCKED_PII', 'BLOCKED_RATE_LIMIT');

-- CreateEnum
CREATE TYPE "BudgetScope" AS ENUM ('GLOBAL_AI', 'CONTENT_ENGINE', 'MARKETING_ADS');

-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('STRIPE', 'RESEND');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- AlterTable
ALTER TABLE "invitation" ADD COLUMN     "jobRole" "JobRole",
ADD COLUMN     "licenseTier" "LicenseTier",
ADD COLUMN     "trackId" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "aiPolicyUrl" TEXT,
ADD COLUMN     "defaultLicenseTier" "LicenseTier",
ADD COLUMN     "defaultTrackId" TEXT;

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "audience" "PlanAudience" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "unitAmountOre" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'dkk',
    "taxBehavior" "TaxBehavior" NOT NULL,
    "minSeats" INTEGER NOT NULL DEFAULT 1,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "trialMaxSeats" INTEGER,
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT,
    "planKey" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastStripeEventAt" TIMESTAMP(3) NOT NULL,
    "lastStripeEventId" TEXT NOT NULL,
    "immediateAccessConsentAt" TIMESTAMP(3),
    "withdrawalWaiverAcknowledgedAt" TIMESTAMP(3),
    "withdrawalConsentTextVersion" TEXT,
    "withdrawalDeadlineAt" TIMESTAMP(3),
    "orderConfirmationEmailMessageId" TEXT,
    "cancellationRequestedInAppAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_request" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "subscriptionId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "agreementReference" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'RECEIVED',
    "receiptEmailMessageId" TEXT,
    "receiptSentAt" TIMESTAMP(3),
    "refundAmountOre" INTEGER,
    "stripeRefundId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track" (
    "id" TEXT NOT NULL,
    "key" "TrackKey" NOT NULL,
    "displayName" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "skinKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "licenseTiers" "LicenseTier"[] DEFAULT ARRAY[]::"LicenseTier"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ModuleType" NOT NULL,
    "jobRole" "JobRole",
    "requiredLicense" "LicenseTier",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedVersionId" TEXT,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "retiringAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_track" (
    "moduleId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "module_track_pkey" PRIMARY KEY ("moduleId","trackId")
);

-- CreateTable
CREATE TABLE "module_version" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ModuleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" "ModuleOrigin" NOT NULL DEFAULT 'MANUAL',
    "schemaVersion" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "requiredLicense" "LicenseTier",
    "featureRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchText" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "changeEventId" TEXT,
    "pipelineRunId" TEXT,
    "draftAttempt" INTEGER NOT NULL DEFAULT 0,
    "promptVersions" JSONB,
    "modelIds" JSONB,
    "verifyReport" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_enrollment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "licenseTier" "LicenseTier",
    "level" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_result" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "anonymousTokenHash" TEXT,
    "trackId" TEXT NOT NULL,
    "licenseTier" "LicenseTier",
    "jobRole" "JobRole",
    "testVersion" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "scorePct" DECIMAL(5,2) NOT NULL,
    "level" INTEGER NOT NULL,
    "recommendedModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durationSeconds" INTEGER,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "source" "AssignmentSource" NOT NULL,
    "assignedById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueAt" TIMESTAMP(3),
    "bestAttemptId" TEXT,
    "bestScorePct" DECIMAL(5,2),
    "passedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "moduleVersionId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "points" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL,
    "scorePct" DECIMAL(5,2),
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "mustPassFailed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_result" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepType" "StepType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "hintLevelUsed" INTEGER NOT NULL DEFAULT 0,
    "tryCount" INTEGER NOT NULL DEFAULT 1,
    "answer" JSONB,
    "gradingStatus" "GradingStatus" NOT NULL DEFAULT 'GRADED',
    "checksReport" JSONB,
    "rubricScores" JSONB,
    "rubricVersion" TEXT,
    "modelId" TEXT,
    "promptVersion" TEXT,
    "matchedSandboxEventId" TEXT,
    "flags" JSONB,
    "promptText" TEXT,
    "aiFeedback" TEXT,
    "promptTextPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate" (
    "id" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "levelLabel" TEXT NOT NULL,
    "licenseTier" "LicenseTier",
    "holderName" TEXT NOT NULL,
    "moduleVersionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pdfStorageKey" TEXT,
    "contentVersion" TEXT NOT NULL,
    "publicVerificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_cycle" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "moduleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "composedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_assignment" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refresherModuleId" TEXT,
    "estimatedMinutes" INTEGER NOT NULL,
    "status" "MonthlyAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "reminderDay1SentAt" TIMESTAMP(3),
    "reminderDay14SentAt" TIMESTAMP(3),
    "reminderDay25SentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_source" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "parserType" "ParserType" NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "fetchMode" "FetchMode" NOT NULL DEFAULT 'DIRECT',
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPublishAllowed" BOOLEAN NOT NULL DEFAULT true,
    "attribution" TEXT,
    "etag" TEXT,
    "lastModified" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_snapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "etag" TEXT,
    "origin" "SnapshotOrigin" NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "raw" BYTEA,
    "rawPurgedAt" TIMESTAMP(3),
    "entries" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_event" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "entryKey" TEXT NOT NULL,
    "entryHash" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "previousText" TEXT,
    "kind" "ChangeKind" NOT NULL,
    "status" "ChangeEventStatus" NOT NULL DEFAULT 'NEW',
    "changeType" TEXT,
    "relevance" DOUBLE PRECISION,
    "classification" JSONB,
    "affectedModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "githubIssueUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_run" (
    "id" TEXT NOT NULL,
    "kind" "PipelineRunKind" NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'RUNNING',
    "steps" JSONB,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "costDkk" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "promptVersions" JSONB,
    "modelIds" JSONB,
    "verifyReport" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "pipeline_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "subjectEmail" TEXT NOT NULL,
    "channel" "ConsentChannel" NOT NULL DEFAULT 'EMAIL',
    "purpose" "ConsentPurpose" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "grantId" TEXT,
    "textVersion" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "source" "ConsentSource" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "checkoutSessionId" TEXT,
    "confirmationTokenHash" TEXT,
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "promptVersion" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "SupportMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolInput" JSONB,
    "toolResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,
    "reason" "EscalationReason" NOT NULL,
    "priority" "EscalationPriority" NOT NULL DEFAULT 'NORMAL',
    "summary" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "digestIncludedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "skinKey" TEXT NOT NULL,
    "worldVersion" TEXT NOT NULL,
    "moduleVersionId" TEXT,
    "sceneId" TEXT,
    "attemptId" TEXT,
    "state" JSONB NOT NULL,
    "nextSeq" INTEGER NOT NULL DEFAULT 1,
    "status" "SandboxSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sandbox_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_event" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" "SandboxEventType" NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'USER',
    "target" TEXT,
    "payload" JSONB NOT NULL,
    "contentText" TEXT,
    "contentPurgedAt" TIMESTAMP(3),
    "stepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_daily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "costDkk" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "costDkk" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "status" "AiCallStatus" NOT NULL,
    "errorCode" TEXT,
    "providerRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_month" (
    "id" TEXT NOT NULL,
    "scope" "BudgetScope" NOT NULL,
    "month" TEXT NOT NULL,
    "limitDkk" DECIMAL(12,2) NOT NULL,
    "spentDkk" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "alert80SentAt" TIMESTAMP(3),
    "alert100SentAt" TIMESTAMP(3),
    "degradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_month_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_event" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "value" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_code_key" ON "plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripePriceId_key" ON "plan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_organizationId_status_idx" ON "subscription"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_request_receiptEmailMessageId_key" ON "withdrawal_request"("receiptEmailMessageId");

-- CreateIndex
CREATE INDEX "withdrawal_request_organizationId_idx" ON "withdrawal_request"("organizationId");

-- CreateIndex
CREATE INDEX "withdrawal_request_status_submittedAt_idx" ON "withdrawal_request"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "track_key_key" ON "track"("key");

-- CreateIndex
CREATE UNIQUE INDEX "module_slug_key" ON "module"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "module_publishedVersionId_key" ON "module"("publishedVersionId");

-- CreateIndex
CREATE INDEX "module_type_idx" ON "module"("type");

-- CreateIndex
CREATE INDEX "module_track_trackId_idx" ON "module_track"("trackId");

-- CreateIndex
CREATE INDEX "module_version_status_origin_idx" ON "module_version"("status", "origin");

-- CreateIndex
CREATE INDEX "module_version_pipelineRunId_idx" ON "module_version"("pipelineRunId");

-- CreateIndex
CREATE UNIQUE INDEX "module_version_moduleId_version_key" ON "module_version"("moduleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "module_version_changeEventId_draftAttempt_key" ON "module_version"("changeEventId", "draftAttempt");

-- CreateIndex
CREATE INDEX "track_enrollment_trackId_active_idx" ON "track_enrollment"("trackId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "track_enrollment_organizationId_userId_trackId_key" ON "track_enrollment"("organizationId", "userId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "placement_result_anonymousTokenHash_key" ON "placement_result"("anonymousTokenHash");

-- CreateIndex
CREATE INDEX "placement_result_userId_trackId_createdAt_idx" ON "placement_result"("userId", "trackId", "createdAt");

-- CreateIndex
CREATE INDEX "placement_result_organizationId_idx" ON "placement_result"("organizationId");

-- CreateIndex
CREATE INDEX "assignment_userId_status_idx" ON "assignment"("userId", "status");

-- CreateIndex
CREATE INDEX "assignment_organizationId_status_idx" ON "assignment"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_organizationId_userId_moduleId_key" ON "assignment"("organizationId", "userId", "moduleId");

-- CreateIndex
CREATE INDEX "attempt_userId_moduleVersionId_idx" ON "attempt"("userId", "moduleVersionId");

-- CreateIndex
CREATE INDEX "attempt_organizationId_completedAt_idx" ON "attempt"("organizationId", "completedAt");

-- CreateIndex
CREATE INDEX "attempt_assignmentId_idx" ON "attempt"("assignmentId");

-- CreateIndex
CREATE INDEX "step_result_createdAt_idx" ON "step_result"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "step_result_attemptId_stepId_key" ON "step_result"("attemptId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_verificationCode_key" ON "certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "certificate_organizationId_idx" ON "certificate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_userId_organizationId_trackId_level_key" ON "certificate"("userId", "organizationId", "trackId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_cycle_month_trackId_key" ON "monthly_cycle"("month", "trackId");

-- CreateIndex
CREATE INDEX "monthly_assignment_organizationId_status_idx" ON "monthly_assignment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "monthly_assignment_userId_idx" ON "monthly_assignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_assignment_cycleId_userId_organizationId_key" ON "monthly_assignment"("cycleId", "userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "content_source_key_key" ON "content_source"("key");

-- CreateIndex
CREATE INDEX "source_snapshot_sourceId_fetchedAt_idx" ON "source_snapshot"("sourceId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "source_snapshot_sourceId_contentHash_key" ON "source_snapshot"("sourceId", "contentHash");

-- CreateIndex
CREATE INDEX "change_event_status_idx" ON "change_event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "change_event_sourceId_entryKey_entryHash_key" ON "change_event"("sourceId", "entryKey", "entryHash");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_run_idempotencyKey_key" ON "pipeline_run"("idempotencyKey");

-- CreateIndex
CREATE INDEX "pipeline_run_kind_startedAt_idx" ON "pipeline_run"("kind", "startedAt");

-- CreateIndex
CREATE INDEX "pipeline_run_sourceId_startedAt_idx" ON "pipeline_run"("sourceId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consent_record_confirmationTokenHash_key" ON "consent_record"("confirmationTokenHash");

-- CreateIndex
CREATE INDEX "consent_record_subjectEmail_purpose_channel_createdAt_idx" ON "consent_record"("subjectEmail", "purpose", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "consent_record_userId_idx" ON "consent_record"("userId");

-- CreateIndex
CREATE INDEX "consent_record_checkoutSessionId_idx" ON "consent_record"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "support_conversation_userId_lastMessageAt_idx" ON "support_conversation"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "support_conversation_organizationId_idx" ON "support_conversation"("organizationId");

-- CreateIndex
CREATE INDEX "support_message_conversationId_createdAt_idx" ON "support_message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "escalation_status_priority_createdAt_idx" ON "escalation"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "sandbox_session_userId_status_idx" ON "sandbox_session"("userId", "status");

-- CreateIndex
CREATE INDEX "sandbox_session_attemptId_idx" ON "sandbox_session"("attemptId");

-- CreateIndex
CREATE INDEX "sandbox_session_organizationId_idx" ON "sandbox_session"("organizationId");

-- CreateIndex
CREATE INDEX "sandbox_event_sessionId_type_idx" ON "sandbox_event"("sessionId", "type");

-- CreateIndex
CREATE INDEX "sandbox_event_organizationId_createdAt_idx" ON "sandbox_event"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "sandbox_event_createdAt_idx" ON "sandbox_event"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_event_sessionId_seq_key" ON "sandbox_event"("sessionId", "seq");

-- CreateIndex
CREATE INDEX "ai_usage_daily_day_idx" ON "ai_usage_daily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_daily_userId_day_key" ON "ai_usage_daily"("userId", "day");

-- CreateIndex
CREATE INDEX "ai_call_createdAt_idx" ON "ai_call"("createdAt");

-- CreateIndex
CREATE INDEX "ai_call_feature_createdAt_idx" ON "ai_call"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "ai_call_organizationId_createdAt_idx" ON "ai_call"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "budget_month_scope_month_key" ON "budget_month"("scope", "month");

-- CreateIndex
CREATE INDEX "webhook_event_receivedAt_idx" ON "webhook_event"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_provider_externalId_key" ON "webhook_event"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_key_key" ON "feature_flag"("key");

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_defaultTrackId_fkey" FOREIGN KEY ("defaultTrackId") REFERENCES "track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_receiptEmailMessageId_fkey" FOREIGN KEY ("receiptEmailMessageId") REFERENCES "email_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "module_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_track" ADD CONSTRAINT "module_track_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_track" ADD CONSTRAINT "module_track_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version" ADD CONSTRAINT "module_version_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version" ADD CONSTRAINT "module_version_changeEventId_fkey" FOREIGN KEY ("changeEventId") REFERENCES "change_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_version" ADD CONSTRAINT "module_version_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_enrollment" ADD CONSTRAINT "track_enrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_enrollment" ADD CONSTRAINT "track_enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_enrollment" ADD CONSTRAINT "track_enrollment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_result" ADD CONSTRAINT "placement_result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_result" ADD CONSTRAINT "placement_result_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_result" ADD CONSTRAINT "placement_result_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_moduleVersionId_fkey" FOREIGN KEY ("moduleVersionId") REFERENCES "module_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_result" ADD CONSTRAINT "step_result_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_cycle" ADD CONSTRAINT "monthly_cycle_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_assignment" ADD CONSTRAINT "monthly_assignment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "monthly_cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_assignment" ADD CONSTRAINT "monthly_assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_assignment" ADD CONSTRAINT "monthly_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_assignment" ADD CONSTRAINT "monthly_assignment_refresherModuleId_fkey" FOREIGN KEY ("refresherModuleId") REFERENCES "module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_source" ADD CONSTRAINT "content_source_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_snapshot" ADD CONSTRAINT "source_snapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "content_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "content_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "source_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "content_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "consent_record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_message" ADD CONSTRAINT "email_message_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "consent_record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_conversation" ADD CONSTRAINT "support_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_conversation" ADD CONSTRAINT "support_conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation" ADD CONSTRAINT "escalation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation" ADD CONSTRAINT "escalation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation" ADD CONSTRAINT "escalation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation" ADD CONSTRAINT "escalation_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_moduleVersionId_fkey" FOREIGN KEY ("moduleVersionId") REFERENCES "module_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_event" ADD CONSTRAINT "sandbox_event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sandbox_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_event" ADD CONSTRAINT "sandbox_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call" ADD CONSTRAINT "ai_call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written (docs/03-datamodel.md § 7): at most ONE non-terminal subscription per organization.
CREATE UNIQUE INDEX "subscription_one_open_per_org" ON "subscription" ("organizationId")
  WHERE "status" NOT IN ('CANCELED', 'INCOMPLETE_EXPIRED');
