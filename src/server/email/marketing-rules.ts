import { marketingConfig } from "@/lib/config/marketing";
import { copenhagenInstant, cphParts, isDanishHoliday } from "@/server/modules/monthly-clock";

// Pure timing/frequency rules for MARKETING (docs/09 § 4). The send path (send.ts) applies them at send time.

const DAY_MS = 24 * 60 * 60 * 1000;

/** 20:00–08:00 Copenhagen, Sundays and Danish public holidays. */
export function isQuietTime(now: Date, cfg = marketingConfig): boolean {
  const p = cphParts(now);
  return p.hour >= cfg.quietFromHour || p.hour < cfg.quietUntilHour || p.weekday === 0 || isDanishHoliday(now);
}

/** The next moment marketing may go out (now if not quiet): 08:00 on the next allowed day. */
export function nextSendWindow(now: Date, cfg = marketingConfig): Date {
  if (!isQuietTime(now, cfg)) return now;
  const p = cphParts(now);
  let candidate = copenhagenInstant(p.year, p.month, p.day + (p.hour < cfg.quietUntilHour ? 0 : 1), cfg.quietUntilHour);
  for (let i = 0; i < 14 && isQuietTime(candidate, cfg); i++) {
    const c = cphParts(candidate);
    candidate = copenhagenInstant(c.year, c.month, c.day + 1, cfg.quietUntilHour);
  }
  return candidate;
}

/** Frequency caps across all flows: given send times of earlier marketing mails, may one more go out now? */
export function withinFrequencyCaps(previousSends: readonly Date[], now: Date, cfg = marketingConfig): boolean {
  return cfg.caps.every((cap) => previousSends.filter((s) => s.getTime() > now.getTime() - cap.days * DAY_MS && s.getTime() <= now.getTime()).length < cap.max);
}

/** The longest cap window — how far back send.ts needs to look. */
export const CAP_LOOKBACK_DAYS = Math.max(...marketingConfig.caps.map((c) => c.days));
