import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-shell";
import { PrintButton } from "@/components/certificate/print-button";
import { SiteFooter } from "@/components/legal/site-footer";
import { SiteLogo } from "@/components/ui/brand";
import { Badge, Notice } from "@/components/ui/primitives";
import { CERTIFICATE_DISCLAIMER } from "@/lib/config/certificates";
import { formatDateDa } from "@/lib/format-date";
import { getMessages } from "@/lib/i18n";
import { findPublicCertificate } from "@/server/certificates/service";
import { db } from "@/server/db";

// Public verification page (docs/05 § 8, § 10a): only when the holder opted in; shows name, track, level, date.
// Not indexed by search engines; unknown and disabled codes look the same. No route-group layout: own quiet top bar.

export const metadata: Metadata = { robots: { index: false, follow: false } };

function Row({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={mono ? "font-mono text-body tracking-[0.04em] text-ink" : "text-body text-ink"}>{children}</dd>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getMessages();
  const t = m.orgAdmin.certificatePublic;
  const v = m.certificateVerify;
  const lookup = safeDecode(code).slice(0, 32);
  const cert = await findPublicCertificate(db(), lookup);
  if (!cert) {
    return (
      <div className="mx-auto w-full max-w-[440px]">
        <AuthCard icon="search" iconTone="neutral" eyebrow={t.title} title={v.notFoundTitle}>
          <Notice tone="error">{t.notFound}</Notice>
        </AuthCard>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 sm:items-center print:hidden">
        <p className="flex flex-col items-start gap-1.5 text-body-sm text-ink-muted sm:flex-row sm:items-center sm:gap-2">
          <Badge tone="success" icon="shield">
            {v.verified}
          </Badge>
          {v.verifiedBody}
        </p>
        <PrintButton>{v.print}</PrintButton>
      </div>
      <article data-testid="public-certificate" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-col gap-10 px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex items-start justify-between gap-4">
            <SiteLogo />
            <span className="hidden print:block">
              <Badge tone="success" icon="check">
                {v.verified}
              </Badge>
            </span>
          </div>
          <header className="flex flex-col gap-3">
            <h1 className="text-overline text-ink-muted uppercase">{t.title}</h1>
            <p className="text-title-1 break-words text-ink sm:text-display">{cert.holderName}</p>
            <p className="text-body-lg text-ink-muted">
              {v.hasCompleted} <span className="font-semibold text-ink">{cert.levelLabel}</span>
            </p>
          </header>
          <dl className="grid gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-2">
            <Row label={t.track}>{cert.trackName}</Row>
            <Row label={t.level}>{cert.levelLabel}</Row>
            <Row label={t.issued}>{formatDateDa(cert.issuedAt)}</Row>
            <Row label={v.code} mono>
              {lookup.trim().toUpperCase()}
            </Row>
          </dl>
        </div>
        <footer className="border-t border-line bg-sunken px-6 py-5 text-body-sm text-ink-muted sm:px-12">{CERTIFICATE_DISCLAIMER}</footer>
      </article>
    </div>
  );
}

export default function PublicCertificatePage(props: PageProps<"/certifikat/[code]">) {
  return (
    <>
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex h-16 max-w-app items-center px-4 sm:px-6">
          <Link href="/" className="rounded-sm" aria-label={getMessages().logoLabel}>
            <SiteLogo />
          </Link>
        </div>
      </header>
      <main id="indhold" className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pt-10 pb-20 sm:px-6 sm:pt-16 print:max-w-none print:p-0">
        <Suspense>
          <Content params={props.params} />
        </Suspense>
      </main>
      <div className="mt-auto print:hidden">
        <SiteFooter variant="compact" />
      </div>
    </>
  );
}

/** Malformed %-sequences must not 500 — treat them as an unknown code. */
function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}
