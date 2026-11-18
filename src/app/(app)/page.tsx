import type { Metadata } from "next";
import { Oversigt } from "@/components/app/oversigt/Oversigt";

export const metadata: Metadata = { title: "Oversigt" };

// The new dashboard (Marco 2026-11-04: "Sæt det nye dashboard ind"). Old dashboard backed up in the session scratchpad.
export default function Page() {
  return <Oversigt />;
}
