import type { Metadata } from "next";
import { Suspense } from "react";
import { Notice, Page } from "@/components/ui/primitives";
import { CERTIFICATE_DISCLAIMER } from "@/lib/config/certificates";
import { formatDateDa } from "@/lib/format-date";
import { getMessages } from "@/lib/i18n";
import { findPublicCertificate } from "@/server/certificates/service";
import { db } from "@/server/db";

// Public verification page (docs/05 § 8, § 10a): only when the holder opted in; shows name, track, level, date.
// Not indexed by search engines; unknown and disabled codes look the same.

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function Content({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = getMessages().orgAdmin.certificatePublic;
  const cert = await findPublicCertificate(db(), decodeURIComponent(code).slice(0, 32));
  if (!cert) return <Notice tone="error">{t.notFound}</Notice>;
  return (
    <>
      <dl className="grid grid-cols-2 gap-2" data-testid="public-certificate">
        <dt>{t.holder}</dt>
        <dd>{cert.holderName}</dd>
        <dt>{t.track}</dt>
        <dd>{cert.trackName}</dd>
        <dt>{t.level}</dt>
        <dd>{cert.levelLabel}</dd>
        <dt>{t.issued}</dt>
        <dd>{formatDateDa(cert.issuedAt)}</dd>
      </dl>
      <p className="text-sm">{CERTIFICATE_DISCLAIMER}</p>
    </>
  );
}

export default function PublicCertificatePage(props: PageProps<"/certifikat/[code]">) {
  return (
    <Page title={getMessages().orgAdmin.certificatePublic.title}>
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </Page>
  );
}
