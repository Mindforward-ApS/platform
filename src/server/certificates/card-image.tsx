import "server-only";
import { ImageResponse } from "next/og";
import { format, getMessages } from "@/lib/i18n";
import { rasterTokens } from "@/server/brand/raster-tokens";

// Raster cards for a certificate: the square CV badge (PNG download) and the 1200×630 link preview that LinkedIn
// shows under a shared post. Colors come from tokens.css via rasterTokens(); no vendor marks.

export interface CardData {
  holderName: string;
  levelLabel: string;
  trackName: string;
  issuedLabel: string;
  verificationCode: string;
}

/** The brand mark inverted for dark cards (light tile, dark chevron). */
function Mark({ size }: { size: number }) {
  const c = rasterTokens();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill={c.surface} />
      <circle cx="21" cy="32" r="6" fill={c.accent} />
      <path d="M32 19 L45 32 L32 45" fill="none" stroke={c.ink} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Square badge for CVs and profiles (600×600). */
export function badgeImage(d: CardData): ImageResponse {
  const c = rasterTokens();
  const t = getMessages().account.certificates;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", padding: 28, background: c.bg }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 44, borderRadius: 36, background: c.night, color: c.surface }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Mark size={44} />
            <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>mindforward</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 18, letterSpacing: 4, color: c["night-accent"] }}>{t.imageOverline}</span>
            <span style={{ fontSize: 50, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{d.levelLabel}</span>
            <span style={{ fontSize: 30, color: c.line }}>{d.trackName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `2px solid ${c["night-line"]}`, paddingTop: 20, fontSize: 20, color: c.line }}>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span>{d.holderName}</span>
              <span style={{ color: c["ink-subtle"] }}>{d.issuedLabel}</span>
            </span>
            <span style={{ letterSpacing: 2 }}>{d.verificationCode}</span>
          </div>
        </div>
      </div>
    ),
    { width: 600, height: 600 },
  );
}

/** Link preview for the public verification page (Open Graph, 1200×630). `null` = generic card, no personal data. */
export function previewImage(d: CardData | null): ImageResponse {
  const c = rasterTokens();
  const t = getMessages().account.certificates;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: c.night, color: c.surface }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Mark size={52} />
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>mindforward</span>
          </div>
          {d && <span style={{ fontSize: 24, letterSpacing: 3, color: c.line }}>{d.verificationCode}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 24, letterSpacing: 5, color: c["night-accent"] }}>{t.imageOverline}</span>
          <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02 }}>{d ? d.holderName : t.imageGeneric}</span>
          {d && <span style={{ fontSize: 36, color: c.line }}>{format(t.imageHasCompleted, { level: d.levelLabel, track: d.trackName })}</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: c["ink-subtle"], borderTop: `2px solid ${c["night-line"]}`, paddingTop: 24 }}>
          <span>{d ? d.issuedLabel : "mindforward.dk"}</span>
          <span>{t.imageVerifiedBy}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
