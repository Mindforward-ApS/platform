import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/config/site";
import { getAuthContext } from "@/server/auth/authz";

// The app has no landing page of its own any more (Marco 20 Oct 2026): signed-in users go to their home,
// everyone else to the website on mindforward.dk.
export default async function RootPage() {
  const ctx = await getAuthContext();
  redirect(ctx ? "/hjem" : SITE_URL);
}
