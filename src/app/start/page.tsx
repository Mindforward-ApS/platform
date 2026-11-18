import { Suspense } from "react";
import { Arbejdsprofil } from "../arbejdsprofil/Arbejdsprofil";

export const metadata = { title: "Kom i gang · Mindforward" };

// The whole sign-up in one flow (Marco 2026-11-17): opret / log ind → kode → (CVR) → arbejdsprofil → niveau → værktøj
// → klar. ?type=privat for the private sign-up; ?login for the sign-in screen (read in the client component).
export default function Page() {
  return <Suspense><Arbejdsprofil from="opret" /></Suspense>;
}
