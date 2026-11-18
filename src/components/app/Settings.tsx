"use client";

import { useState } from "react";
import { can, useRole } from "@/lib/role";
import { Avatar, Card } from "./ui";

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-[0.75rem] font-medium text-heading">{label}</span>
      <input type={type} defaultValue={defaultValue} className="app-input mt-1.5 h-9 w-full rounded-[6px] px-3 text-[0.8125rem] text-heading outline-none" />
    </label>
  );
}

function Toggle({ label, sub, on: initial }: { label: string; sub: string; on: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] py-3.5 first:border-t-0">
      <div>
        <div className="text-[0.8125rem] font-medium text-heading">{label}</div>
        <div className="text-[0.6875rem] text-muted">{sub}</div>
      </div>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => setOn((v) => !v)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--coral)]" : "bg-[#d8cfca]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function Settings({ name, initials, email }: { name: string; initials: string; email: string }) {
  const role = useRole();
  const [saved, setSaved] = useState(false);
  return (
    <div className="grid max-w-4xl gap-4">
      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold text-heading">Profil</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar initials={initials} size={52} />
          <button className="app-btn app-btn-light">Skift billede</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Navn" defaultValue={name} />
          <Field label="E-mail" defaultValue={email} type="email" />
          <Field label="Stilling" defaultValue="Kundeservice" />
          <Field label="Ugentligt mål (minutter)" defaultValue="300" type="number" />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          {saved ? <span className="text-[0.75rem] text-muted">Gemt</span> : null}
          <button onClick={() => setSaved(true)} className="app-btn app-btn-ink">Gem ændringer</button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold text-heading">Notifikationer</h2>
        <div className="mt-2">
          <Toggle label="Påmindelse om din plan" sub="En mail 10 minutter før en planlagt lektion" on />
          <Toggle label="Feedback på opgaver" sub="Når en opgave i øvemiljøet er vurderet" on />
          <Toggle label="Nye kurser" sub="Når der kommer nye kurser i kataloget" on={false} />
        </div>
      </Card>

      {/* Subscription depends on the role (Marco 2026-11-11): Privat manages their own, Admin the company's
          (and may change it), Medarbejder only sees that the company pays. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-heading">Abonnement</h2>
            <p className="mt-1 text-[0.75rem] text-muted">
              {role === "privat" ? "Privat · 69 kr./md. inkl. moms · ingen binding" : role === "admin" ? "Nordlys Logistik · 10 brugere eller flere · 55 kr. pr. bruger/md. ekskl. moms · telefonsupport" : "Betales af Nordlys Logistik. Kontakt jeres admin, hvis du har spørgsmål."}
            </p>
          </div>
          {can.billing(role) && (
            <div className="flex gap-2">
              <button className="app-btn app-btn-light">{role === "admin" ? "Skift pakke" : "Skift til årlig"}</button>
              {role === "admin" && <button className="app-btn app-btn-light">Fakturaer</button>}
              <button className="app-btn app-btn-light">Opsig</button>
            </div>
          )}
        </div>
      </Card>
      {role === "medarbejder" && (
        <Card className="p-5">
          <h2 className="text-[0.9375rem] font-semibold text-heading">Det kan din admin se</h2>
          <p className="mt-1 text-[0.75rem] text-muted">Dit navn, hvor langt du er, din score og hvornår du sidst var aktiv. Aldrig det, du skriver i øvemiljøet. Dine kolleger kan ikke se dine resultater.</p>
        </Card>
      )}
    </div>
  );
}
