import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { serverEnv } from "@/lib/env";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { listMyCertificates } from "@/server/certificates/service";
import { db } from "@/server/db";
import { togglePublicVerification } from "./actions";

// L7 Mine certifikater: list, PDF download, public verification page on/off (default off).

async function Content() {
  const ctx = await guardPage(() => requireUser(), "/certifikater");
  const t = getMessages().orgAdmin.certificates;
  const certs = await listMyCertificates(db(), ctx.user.id);
  if (certs.length === 0) return <p>{t.empty}</p>;
  return (
    <ul className="flex flex-col gap-3" data-testid="certificates">
      {certs.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <strong>
            {c.track.displayName} · {c.levelLabel}
          </strong>
          <span className="text-sm">
            {format(t.issued, { date: formatDateDa(c.issuedAt) })} · {c.organization.name}
          </span>
          <span className="text-sm" data-testid="certificate-code">
            {format(t.code, { code: c.verificationCode })}
          </span>
          <a className="underline" href={`/api/certifikater/${c.id}/pdf`}>
            {t.download}
          </a>
          <p className="text-sm">{c.publicVerificationEnabled ? t.publicOn : t.publicOff}</p>
          {c.publicVerificationEnabled && (
            <p className="text-sm">
              {t.publicUrl}{" "}
              <a className="underline" href={`/certifikat/${c.verificationCode}`}>
                {`${serverEnv().APP_URL}/certifikat/${c.verificationCode}`}
              </a>
            </p>
          )}
          <p className="text-sm">{t.publicExplain}</p>
          <form action={togglePublicVerification}>
            <input type="hidden" name="certificateId" value={c.id} />
            <input type="hidden" name="enabled" value={c.publicVerificationEnabled ? "0" : "1"} />
            <SubmitButton variant="secondary">{c.publicVerificationEnabled ? t.disablePublic : t.enablePublic}</SubmitButton>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default function CertificatesPage() {
  return (
    <Page title={getMessages().orgAdmin.certificates.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
