import type { Metadata } from "next";
import { Tilmeld } from "./Tilmeld";

export const metadata: Metadata = { title: "Opret konto" };

// Sign-up copied closely from Marco's reference video (2026-11-11), in Mindforward's colours.
export default function Page() {
  return <Tilmeld />;
}
