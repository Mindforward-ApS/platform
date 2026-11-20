"use client";

import { useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { Button, buttonClass, Notice } from "@/components/ui/primitives";
import { cvLine, linkedinAddToProfileUrl, linkedinShareUrl, mailtoHref, shareText, credentialName } from "@/lib/certificate-share";
import type { Messages } from "@/lib/i18n/da";

// Share a certificate: LinkedIn profile + post, link, mail, the phone's share sheet, and a CV line.
// Everything that points at the public page is only offered once the holder has switched that page on (§ 10a).

type T = Messages["account"]["certificates"]["share"];

export interface SharePanelProps {
  certificateId: string;
  isPublic: boolean;
  levelLabel: string;
  trackName: string;
  issuedAt: string; // ISO, serialisable across the server/client boundary
  verificationCode: string;
  verifyUrl: string;
  t: T;
}

function CopyButton({ text, label, copiedLabel, icon }: { text: string; label: string; copiedLabel: string; icon: IconName }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      icon={copied ? "check" : icon}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}

const noSubscribe = () => () => undefined;
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export function SharePanel(p: SharePanelProps) {
  const cert = { levelLabel: p.levelLabel, trackName: p.trackName, issuedAt: new Date(p.issuedAt), verificationCode: p.verificationCode, verifyUrl: p.verifyUrl };
  // The phone's share sheet exists only in some browsers; false during server render.
  const canNativeShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const line = cvLine(cert);

  return (
    <div className="flex flex-col gap-5" data-testid="certificate-share">
      <section className="flex flex-col gap-3">
        <h3 className="text-label text-ink">{p.t.title}</h3>
        {p.isPublic ? (
          <>
            <div className="flex flex-wrap gap-2">
              <a className={buttonClass("secondary", "sm")} href={linkedinAddToProfileUrl(cert)} {...external} data-testid="linkedin-add">
                <Icon name="idCard" />
                {p.t.linkedinAdd}
              </a>
              <a className={buttonClass("secondary", "sm")} href={linkedinShareUrl(p.verifyUrl)} {...external}>
                <Icon name="share" />
                {p.t.linkedinPost}
              </a>
              <CopyButton text={p.verifyUrl} label={p.t.copyLink} copiedLabel={p.t.copied} icon="link" />
              <a className={buttonClass("ghost", "sm")} href={mailtoHref(cert)}>
                <Icon name="mail" />
                {p.t.email}
              </a>
              {canNativeShare && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon="send"
                  onClick={() => navigator.share({ title: credentialName(cert), text: shareText(cert), url: p.verifyUrl }).catch(() => undefined)}
                >
                  {p.t.more}
                </Button>
              )}
            </div>
            <p className="text-caption text-ink-muted">{p.t.linkedinAddHint}</p>
          </>
        ) : (
          <Notice tone="info" icon="lock">
            {p.t.needsPublic}
          </Notice>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h3 className="text-label text-ink">{p.t.cvTitle}</h3>
        <p className="text-body-sm text-ink-muted">{p.t.cvHint}</p>
        {p.isPublic && (
          <p className="rounded-sm border border-line bg-sunken px-3 py-2.5 font-mono text-mono break-words text-ink" data-testid="cv-line">
            {line}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {p.isPublic && <CopyButton text={line} label={p.t.copyCvLine} copiedLabel={p.t.copied} icon="copy" />}
          <a className={buttonClass("secondary", "sm")} href={`/api/certifikater/${p.certificateId}/pdf`}>
            <Icon name="download" />
            {p.t.pdf}
          </a>
          <a className={buttonClass("secondary", "sm")} href={`/api/certifikater/${p.certificateId}/badge`}>
            <Icon name="award" />
            {p.t.badge}
          </a>
        </div>
      </section>
    </div>
  );
}
