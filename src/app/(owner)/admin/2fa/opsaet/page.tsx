import { redirect } from "next/navigation";
import { Suspense } from "react";
import { generateURI } from "otplib";
import { Button, Field, Notice, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { serverEnv } from "@/lib/env";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { decryptSecret } from "@/server/auth/secret-box";
import { db } from "@/server/db";
import { beginTwoFactorSetup, confirmTwoFactorSetup } from "../../actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().admin;
  const ctx = await guardPage(() => requireUser(), "/admin/2fa/opsaet");
  const user = await db().user.findUnique({ where: { id: ctx.user.id }, select: { platformRole: true, twoFactorEnabled: true } });
  if (user?.platformRole !== "GREB_ADMIN") redirect("/konto?fejl=adgang");
  if (user.twoFactorEnabled) redirect("/admin/2fa");

  const pending = await db().twoFactor.findFirst({ where: { userId: ctx.user.id } });
  const sp = await searchParams;
  if (!pending) {
    return (
      <form action={beginTwoFactorSetup}>
        <Button type="submit">{t.setupTitle}</Button>
      </form>
    );
  }
  // Shown only to the admin themself while enrollment is pending.
  const secret = decryptSecret(pending.secret, serverEnv().BETTER_AUTH_SECRET);
  return (
    <>
      <p>{t.setupBody}</p>
      <p className="font-mono break-all" data-testid="totp-secret">
        {t.secretLabel}: {secret}
      </p>
      <p className="font-mono text-sm break-all">{generateURI({ issuer: "Greb", label: ctx.user.email, secret })}</p>
      {sp.fejl && <Notice tone="error">{t.invalidCode}</Notice>}
      <form action={confirmTwoFactorSetup} className="flex flex-col gap-3">
        <Field label={t.codeLabel} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required />
        <Button type="submit">{t.verify}</Button>
      </form>
    </>
  );
}

export default function SetupTwoFactorPage(props: PageProps<"/admin/2fa/opsaet">) {
  return (
    <Page title={getMessages().admin.setupTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
