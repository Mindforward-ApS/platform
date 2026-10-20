"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Buttons for the login/signup form in the website's style (mindforward.dk): a navy primary like "Kom i gang",
// and white "bezel" buttons (grey 3px edge, hairline inside, logo on a grey tile) like the hero's Google/Microsoft.
// Both disable themselves while the form is pending, so a double click cannot submit twice.

const bezel =
  "group flex h-12 w-full items-center gap-3 rounded-[14px] border-[3px] border-site-bezel bg-surface bg-clip-padding pr-5 pl-[5px] text-[15.5px] font-semibold text-site-ink shadow-[inset_0_0_0_1px_var(--color-site-hairline),0_1px_2px_var(--color-site-lift)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-site-bezel-hover hover:shadow-[inset_0_0_0_1px_var(--color-site-hairline),0_2px_6px_-2px_var(--color-site-lift)] active:translate-y-px disabled:opacity-60";

export function PrimarySubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-[14px] bg-site-navy text-[15.5px] font-semibold text-on-sidebar transition hover:bg-site-navy-hover disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function BezelSubmit({ icon, children, ...props }: { icon: ReactNode; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={bezel} {...props}>
      <span className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-site-tile">{icon}</span>
      {children}
    </button>
  );
}
