"use client";

// Who is looking (Marco 2026-11-11). Three roles: Privat, Medarbejder, Admin (the company owner has the same rights
// as Admin, incl. billing). In this preview the role is picked with the switcher at the bottom; in greb it comes from
// the membership (LEARNER → medarbejder, ADMIN/OWNER → admin, no company → privat).
import { useSyncExternalStore } from "react";

export type Role = "privat" | "medarbejder" | "admin";
const KEY = "mf-preview-role";
let role: Role = "admin";
try { const r = typeof window !== "undefined" ? (localStorage.getItem(KEY) as Role | null) : null; if (r === "privat" || r === "medarbejder" || r === "admin") role = r; } catch {}
const subs = new Set<() => void>();

export function setRole(r: Role) {
  role = r;
  try { localStorage.setItem(KEY, r); } catch {}
  subs.forEach((f) => f());
}
export function useRole() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => role, () => "admin" as Role);
}

// What each role may do (the rules agreed with Marco).
export const can = {
  seeTeam: (r: Role) => r === "admin", // Mit hold: names and scores, Skub, report
  invite: (r: Role) => r === "admin",
  billing: (r: Role) => r === "admin" || r === "privat", // Admin can change the company plan; Privat their own
};
export const roleLabel: Record<Role, string> = { privat: "Privat", medarbejder: "Medarbejder", admin: "Admin · Nordlys Logistik" };
