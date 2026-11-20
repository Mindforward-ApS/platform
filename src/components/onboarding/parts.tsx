"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Building blocks from the approved onboarding preview: bordered field, big answer card (a real radio input, so the
// forms work without JavaScript), dark primary button that disables itself while the form is pending.

export const fieldClass =
  "h-12 rounded-[10px] border border-web-line-strong bg-web-surface px-4 text-[0.9375rem] text-web-ink outline-none transition placeholder:text-web-muted/70 focus:border-web-coral focus:ring-2 focus:ring-web-coral/20 aria-[invalid=true]:border-web-coral-ink";

export function Field({ label, className = "", ...p }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`grid gap-1.5 text-[0.875rem] font-medium text-web-ink ${className}`}>
      {label}
      <input {...p} className={fieldClass} />
    </label>
  );
}

export function Choice({
  name,
  value,
  checked,
  onSelect,
  title,
  sub,
  icon,
  badge,
  required,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: string;
  sub?: string;
  icon?: ReactNode;
  badge?: string;
  required?: boolean;
}) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-4 rounded-[14px] border-2 bg-web-surface p-4 text-left transition has-focus-visible:ring-2 has-focus-visible:ring-web-coral/30 ${
        checked ? "border-web-coral" : "border-web-line-strong hover:border-web-stage-muted/50"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onSelect(value)} required={required} className="sr-only" />
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-[1rem] font-semibold text-web-ink">
          {title}
          {badge && <span className="rounded-full bg-web-coral-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-web-coral-ink">{badge}</span>}
        </span>
        {sub && <span className="mt-0.5 block text-[0.875rem] text-web-muted">{sub}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-web-coral bg-web-coral" : "border-web-line-strong bg-transparent"}`}
      >
        {checked && <span className="size-1.5 rounded-full bg-web-white" />}
      </span>
    </label>
  );
}

/** Same look as Choice, but a link (for choices that navigate, like "Til mig selv" / "Til min virksomhed"). */
export function ChoiceLinkBody({ title, sub, icon }: { title: string; sub?: string; icon?: ReactNode }) {
  return (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[1rem] font-semibold text-web-ink">{title}</span>
        {sub && <span className="mt-0.5 block text-[0.875rem] text-web-muted">{sub}</span>}
      </span>
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-web-line-strong" />
    </>
  );
}

export const choiceLinkClass =
  "flex w-full items-center gap-4 rounded-[14px] border-2 border-web-line-strong bg-web-surface p-4 text-left transition hover:border-web-stage-muted/50 focus-visible:ring-2 focus-visible:ring-web-coral/30 focus-visible:outline-none";

export function Primary({ children, disabled, name, value }: { children: ReactNode; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className="h-12 w-full rounded-[10px] bg-web-stage text-[0.9375rem] font-semibold text-web-white transition hover:bg-web-stage-raised disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-[10px] border border-web-coral-ink/30 bg-web-coral-soft px-4 py-3 text-[0.875rem] text-web-coral-ink">
      {children}
    </p>
  );
}

export function SoftNote({ children, role }: { children: ReactNode; role?: "status" }) {
  return (
    <p role={role} className="rounded-[12px] bg-web-surface p-4 text-[0.875rem] text-web-muted ring-1 ring-web-line">
      {children}
    </p>
  );
}

export function IconCircle({ children }: { children: ReactNode }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-web-bg text-web-ink ring-1 ring-web-line">{children}</span>;
}
