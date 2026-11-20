import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SITE_URL } from "@/lib/config/site";
import { getAuthContext } from "@/server/auth/authz";

// The app has no landing page of its own any more (Marco 20 Oct 2026): signed-in users go to their home,
// everyone else to the website on mindforward.dk.
async function Redirect(): Promise<null> {
  const ctx = await getAuthContext();
  redirect(ctx ? "/hjem" : SITE_URL);
}

// The session cookie is runtime data: with cacheComponents it must be read inside <Suspense>, or the build fails.
export default function RootPage() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}
