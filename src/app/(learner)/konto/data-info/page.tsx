import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { acknowledgeDataInfo } from "./actions";

// First-login information for B2B employees (docs/10 § 1.6): what the admin can see, cannot see, retention, links.

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/konto/data-info");
  const t = getMessages().orgAdmin.firstLogin;
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { name: true } });
  return (
    <>
      <p>{format(t.intro, { organization: org.name })}</p>
      <section data-testid="admin-can-see">
        <h2 className="font-semibold">{t.canSeeTitle}</h2>
        <ul className="list-disc pl-5">
          {t.canSee.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section data-testid="admin-cannot-see">
        <h2 className="font-semibold">{t.cannotSeeTitle}</h2>
        <ul className="list-disc pl-5">
          {t.cannotSee.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">{t.retentionTitle}</h2>
        <p>{t.retention}</p>
        <p>{t.learning}</p>
      </section>
      <p className="text-sm">
        {t.privacyLinks}{" "}
        <a className="underline" href="/privatliv">
          {t.privacyLink}
        </a>
      </p>
      <a className="underline" href="/konto/data">
        {t.myData}
      </a>
      <form action={acknowledgeDataInfo}>
        <SubmitButton>{t.continue}</SubmitButton>
      </form>
    </>
  );
}

export default function DataInfoPage() {
  return (
    <Page title={getMessages().orgAdmin.firstLogin.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
