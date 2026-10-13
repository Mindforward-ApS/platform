import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

// Neutral placeholder primitives. Only token-based utilities (src/styles/tokens.css); design is decided later with Marco.

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const look = variant === "primary" ? "bg-accent text-accent-fg" : "border border-border bg-surface text-fg";
  return <button className={`rounded-md px-4 py-2 ${look} ${className}`} {...props} />;
}

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input className="rounded-md border border-border bg-bg px-3 py-2" {...props} />
    </label>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-md border p-3 text-sm ${tone === "error" ? "border-danger text-danger" : "border-border"}`}>
      {children}
    </p>
  );
}
