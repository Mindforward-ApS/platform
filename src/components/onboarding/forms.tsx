"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import type { FormState } from "@/components/admin/action-form";
import { BrandIcon, type BrandKey } from "@/components/ui/brand-icon";
import type { Messages } from "@/lib/i18n/da";
import { Choice, ErrorNote, Field, fieldClass, Primary, SoftNote } from "./parts";

// The interactive onboarding steps (approved preview, Marco 11 Nov 2026). Each form posts to a server action that
// validates with Zod, saves and redirects to the next step; errors come back as i18n text.

type T = Messages["onboarding"];
type Action = (state: FormState | null, formData: FormData) => Promise<FormState>;

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

// ── Tilmeld ───────────────────────────────────────────────────────────────

export interface SignupState {
  error?: string;
  values?: { firstName: string; lastName: string; phone: string; email: string };
}

export function SignupForm({
  t,
  kind,
  next,
  action,
}: {
  t: T["signup"];
  kind: "privat" | "virksomhed" | null;
  next: string | null;
  action: (state: SignupState | null, formData: FormData) => Promise<SignupState>;
}) {
  const [state, formAction] = useActionState(action, null);
  const [form, setForm] = useState(state?.values ?? { firstName: "", lastName: "", phone: "", email: "" });
  const ok = form.firstName.trim() && form.lastName.trim() && form.phone.trim() && /\S+@\S+\.\S+/.test(form.email);
  const business = kind === "virksomhed";
  const loginHref = next ? `/log-ind?next=${encodeURIComponent(next)}` : "/log-ind";
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {kind && <input type="hidden" name="kind" value={kind} />}
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.firstName} name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" required maxLength={60} />
        <Field label={t.lastName} name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" required maxLength={60} />
      </div>
      <Field label={t.phone} name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" placeholder={t.phonePlaceholder} required maxLength={40} />
      <Field
        label={business ? t.emailVirksomhed : t.emailPrivat}
        name="email"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        autoComplete="email"
        inputMode="email"
        placeholder={business ? t.emailPlaceholderVirksomhed : t.emailPlaceholderPrivat}
        required
        maxLength={254}
      />
      <Primary disabled={!ok}>{t.submit}</Primary>
      <p className="text-center text-[0.8125rem] text-web-muted">
        {t.haveAccount}{" "}
        <Link href={loginHref} className="font-semibold text-web-ink underline">
          {t.login}
        </Link>
      </p>
    </form>
  );
}

// ── Kode ──────────────────────────────────────────────────────────────────

export function CodeForm({ t, action, resend }: { t: T["code"]; action: Action; resend: Action }) {
  const [state, formAction] = useActionState(action, null);
  const [resendState, resendAction] = useActionState(resend, null);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const code = digits.join("");

  const setAll = (next: string[]) => {
    setDigits(next);
    // Submit as soon as all six digits are there (like the preview); the hidden input carries the code.
    if (next.every(Boolean)) setTimeout(() => formRef.current?.requestSubmit(), 150);
  };
  const onChange = (k: number, raw: string) => {
    const only = raw.replace(/\D/g, "");
    if (only.length > 1) {
      // Pasted or autofilled code: spread it over the boxes.
      const next = [...digits];
      for (let i = 0; i < only.length && k + i < 6; i++) next[k + i] = only[i] ?? "";
      refs.current[Math.min(k + only.length, 5)]?.focus();
      return setAll(next);
    }
    const next = [...digits];
    next[k] = only;
    if (only && k < 5) refs.current[k + 1]?.focus();
    setAll(next);
  };

  return (
    <div className="grid gap-5">
      <form ref={formRef} action={formAction} className="grid gap-5">
        {state?.error && <ErrorNote>{state.error}</ErrorNote>}
        <input type="hidden" name="code" value={code} />
        <div className="flex justify-between gap-2">
          {digits.map((d, k) => (
            <input
              key={k}
              ref={(el) => {
                refs.current[k] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete={k === 0 ? "one-time-code" : "off"}
              autoFocus={k === 0}
              aria-label={fill(t.digit, { n: k + 1 })}
              onChange={(e) => onChange(k, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && k) refs.current[k - 1]?.focus();
              }}
              className="h-14 w-full min-w-0 rounded-[10px] border border-web-line-strong bg-web-surface text-center text-[1.5rem] font-semibold text-web-ink outline-none focus:border-web-coral focus:ring-2 focus:ring-web-coral/20"
            />
          ))}
        </div>
        <Primary disabled={code.length !== 6}>{t.submit}</Primary>
      </form>
      <form action={resendAction} className="text-center text-[0.8125rem] text-web-muted">
        {resendState?.ok && (
          <span role="status" className="mb-2 block">
            {resendState.ok}
          </span>
        )}
        {resendState?.error && (
          <span role="alert" className="mb-2 block text-web-coral-ink">
            {resendState.error}
          </span>
        )}
        {t.noCode}{" "}
        <button type="submit" className="font-semibold text-web-ink underline">
          {t.resend}
        </button>
      </form>
    </div>
  );
}

// ── Medlemskab (privat) ──────────────────────────────────────────────────

export function MembershipForm({
  t,
  prices,
  initial,
  action,
  continueLabel,
}: {
  t: T["membership"];
  prices: { single: string; friend: string; friendEach: string; student: string };
  initial: { plan: string; friendEmail: string; studentEmail: string };
  action: Action;
  continueLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [plan, setPlan] = useState(initial.plan);
  return (
    <form action={formAction} className="grid gap-3">
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <Choice name="plan" value="SINGLE" checked={plan === "SINGLE"} onSelect={setPlan} title={t.single} sub={fill(t.perMonth, { amount: prices.single })} />
      <Choice
        name="plan"
        value="FRIEND"
        checked={plan === "FRIEND"}
        onSelect={setPlan}
        title={t.friend}
        sub={fill(t.friendSub, { amount: prices.friend })}
        badge={fill(t.friendBadge, { amount: prices.friendEach })}
      />
      {plan === "FRIEND" && <Field label={t.friendEmail} name="friendEmail" type="email" defaultValue={initial.friendEmail} placeholder={t.friendPlaceholder} required maxLength={254} />}
      <Choice name="plan" value="STUDENT" checked={plan === "STUDENT"} onSelect={setPlan} title={t.student} sub={fill(t.perMonth, { amount: prices.student })} badge={t.studentBadge} />
      {plan === "STUDENT" && (
        <div className="grid gap-2 rounded-[14px] bg-web-surface p-4 ring-1 ring-web-line">
          <Field label={t.studentEmail} name="studentEmail" type="email" defaultValue={initial.studentEmail} placeholder={t.studentPlaceholder} required maxLength={254} />
          {/* TODO(onboarding): upload of a student card / proof of job seeking needs file storage (not built). */}
          <p className="text-[0.8125rem] text-web-muted">
            {t.noStudentEmail} {t.uploadSoon}
          </p>
        </div>
      )}
      <Primary disabled={!plan}>{continueLabel}</Primary>
    </form>
  );
}

// ── Om jeres virksomhed (erhverv) ────────────────────────────────────────

export function CompanyForm({
  t,
  prices,
  initial,
  action,
  continueLabel,
}: {
  t: T["company"];
  prices: { small: string; large: string };
  initial: { name: string; band: string };
  action: Action;
  continueLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [name, setName] = useState(initial.name);
  const [band, setBand] = useState(initial.band);
  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <Field label={t.name} name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="organization" required maxLength={120} />
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-[0.875rem] font-medium text-web-ink">{t.sizeQuestion}</legend>
        <Choice name="band" value="SIZE_1_9" checked={band === "SIZE_1_9"} onSelect={setBand} title={t.small} sub={fill(t.smallSub, { amount: prices.small })} />
        <Choice name="band" value="SIZE_10_PLUS" checked={band === "SIZE_10_PLUS"} onSelect={setBand} title={t.large} sub={fill(t.largeSub, { amount: prices.large })} badge={t.largeBadge} />
        <Choice name="band" value="ENTERPRISE" checked={band === "ENTERPRISE"} onSelect={setBand} title={t.enterprise} sub={t.enterpriseSub} />
      </fieldset>
      <Primary disabled={name.trim().length < 2 || !band}>{continueLabel}</Primary>
    </form>
  );
}

// ── Inviter dit hold (erhverv) ───────────────────────────────────────────

export function InviteForm({
  t,
  canInvite,
  dpaNotice,
  action,
  linkAction,
  skipHref,
}: {
  t: T["invite"];
  canInvite: boolean;
  dpaNotice: ReactNode;
  action: Action;
  linkAction: Action;
  skipHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [linkState, linkFormAction] = useActionState(linkAction, null);
  const [emails, setEmails] = useState("");
  const [copied, setCopied] = useState(false);
  const count = emails.trim() ? emails.trim().split(/[\s,;]+/).filter(Boolean).length : 0;
  const link = linkState?.detail;

  return (
    <div className="grid gap-4">
      {!canInvite && dpaNotice}
      <form action={formAction} className="grid gap-4" id="invite-form">
        {state?.error && <ErrorNote>{state.error}</ErrorNote>}
        <label className="grid gap-1.5 text-[0.875rem] font-medium text-web-ink">
          {t.emails}
          <textarea
            name="emails"
            rows={4}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder={t.emailsPlaceholder}
            disabled={!canInvite}
            maxLength={20_000}
            className={`${fieldClass} h-auto p-4 disabled:opacity-50`}
          />
        </label>
      </form>
      <form action={linkFormAction} className="flex items-center justify-between gap-3 rounded-[12px] bg-web-surface p-3 pl-4 text-[0.875rem] text-web-muted ring-1 ring-web-line">
        <span className="min-w-0 truncate" data-testid="invite-link">
          {link ?? linkState?.error ?? ""}
        </span>
        {link ? (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => setCopied(true));
            }}
            className="shrink-0 rounded-[8px] bg-web-bg px-3 py-1.5 font-semibold text-web-ink ring-1 ring-web-line"
          >
            {copied ? t.copied : t.copyLink}
          </button>
        ) : (
          <button type="submit" disabled={!canInvite} className="shrink-0 rounded-[8px] bg-web-bg px-3 py-1.5 font-semibold text-web-ink ring-1 ring-web-line disabled:opacity-50">
            {t.makeLink}
          </button>
        )}
      </form>
      {count > 0 && canInvite ? (
        <button
          type="submit"
          form="invite-form"
          className="h-12 w-full rounded-[10px] bg-web-stage text-[0.9375rem] font-semibold text-web-white transition hover:bg-web-stage-raised"
        >
          {count === 1 ? t.sendOne : fill(t.send, { count })}
        </button>
      ) : (
        <Link href={skipHref} className="grid h-12 w-full place-items-center rounded-[10px] bg-web-stage text-[0.9375rem] font-semibold text-web-white transition hover:bg-web-stage-raised">
          {t.skip}
        </Link>
      )}
    </div>
  );
}

// ── Start / værktøj ──────────────────────────────────────────────────────

export function StartForm({ t, initial, action, continueLabel }: { t: T["start"]; initial: string; action: Action; continueLabel: string }) {
  const [state, formAction] = useActionState(action, null);
  const [path, setPath] = useState(initial);
  return (
    <form action={formAction} className="grid gap-3">
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <Choice name="path" value="PLACEMENT_TEST" checked={path === "PLACEMENT_TEST"} onSelect={setPath} title={t.test} sub={t.testSub} />
      <Choice name="path" value="FROM_SCRATCH" checked={path === "FROM_SCRATCH"} onSelect={setPath} title={t.scratch} sub={t.scratchSub} />
      <Primary disabled={!path}>{continueLabel}</Primary>
    </form>
  );
}

export function ToolForm({
  t,
  tools,
  initial,
  lead,
  action,
  continueLabel,
}: {
  t: T["tool"];
  tools: { slug: BrandKey; name: string }[];
  initial: string;
  lead: string;
  action: Action;
  continueLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [tool, setTool] = useState(initial);
  return (
    <form action={formAction} className="grid gap-3" aria-label={lead}>
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      {tools.map((x) => (
        <Choice
          key={x.slug}
          name="track"
          value={x.slug}
          checked={tool === x.slug}
          onSelect={setTool}
          title={x.name}
          sub={fill(t.sub, { tool: x.name })}
          icon={<BrandIcon brand={x.slug} size={36} className="rounded-[9px]" />}
        />
      ))}
      <Primary disabled={!tool}>{continueLabel}</Primary>
    </form>
  );
}

export { SoftNote };
