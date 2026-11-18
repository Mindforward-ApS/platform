import { redirect } from "next/navigation";

// Øvemiljø = the real Mindforward sandbox (ported 2026-11-03). Opens on ChatGPT; the tool tabs switch track.
// The old task-list page is backed up in the session scratchpad.
export default function OevemiljoePage() {
  redirect("/oevemiljoe/chatgpt");
}
