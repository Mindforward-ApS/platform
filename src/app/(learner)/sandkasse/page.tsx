import { redirect } from "next/navigation";

// Øvemiljø in the sidebar opens ChatGPT; the sandbox's tool tabs switch track.
export default function SandboxIndex() {
  redirect("/sandkasse/chatgpt");
}
