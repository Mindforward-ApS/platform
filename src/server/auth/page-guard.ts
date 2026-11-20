import "server-only";
import { redirect } from "next/navigation";
import { AuthzError } from "./authz-core";

/** For pages: turn authorization failures into redirects instead of error pages. */
export async function guardPage<T>(check: () => Promise<T>, loginReturnTo?: string): Promise<T> {
  try {
    return await check();
  } catch (err) {
    if (!(err instanceof AuthzError)) throw err;
    switch (err.code) {
      case "UNAUTHENTICATED":
        redirect(loginReturnTo ? `/log-ind?next=${encodeURIComponent(loginReturnTo)}` : "/log-ind");
      case "TWO_FACTOR_SETUP_REQUIRED":
        redirect("/admin/2fa/opsaet");
      case "TWO_FACTOR_REQUIRED":
        redirect("/admin/2fa");
      case "FORBIDDEN":
        redirect("/konto?fejl=adgang");
    }
  }
}
