"use client";

// Preview-only role switcher (bottom of the screen) and the role line in the top bar. Marco 2026-11-11.
import { roleLabel, setRole, useRole, type Role } from "@/lib/role";

export function RoleLabel() {
  return <>{roleLabel[useRole()]}</>;
}

export function RoleSwitcher() {
  const r = useRole();
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-0.5 rounded-full bg-[#201613]/90 p-1 pl-3 text-[0.75rem] shadow-lg ring-1 ring-white/15 backdrop-blur">
      {/* Preview only: kept small in the corner so it doesn't sit on top of the page content. */}
      <span className="mr-1 text-white/50">Se som</span>
      {(["privat", "medarbejder", "admin"] as Role[]).map((k) => (
        <button key={k} type="button" onClick={() => setRole(k)} className={`rounded-full px-2.5 py-1 font-medium capitalize ${r === k ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}>{k}</button>
      ))}
    </div>
  );
}

// Shown instead of an admin page when someone without the role opens it.
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const r = useRole();
  if (r === "admin") return <>{children}</>;
  return (
    <div className="grid min-h-[60svh] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <p className="text-[1.25rem] font-semibold text-heading">Kun for admins</p>
        <p className="mt-2 text-[0.875rem] text-muted">{r === "privat" ? "Mit hold findes kun for virksomheder." : "Holdoversigten kan kun ses af virksomhedens admin. Du kan altid se dit eget fremskridt under Oversigt."}</p>
      </div>
    </div>
  );
}
