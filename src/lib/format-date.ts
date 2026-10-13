// Danish date formatting in Copenhagen time (UI, PDFs, CSV exports).
const dateFormat = new Intl.DateTimeFormat("da-DK", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Copenhagen" });
const isoFormat = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Copenhagen" });

export function formatDateDa(date: Date | null | undefined): string {
  return date ? dateFormat.format(date) : "";
}

/** yyyy-mm-dd in Copenhagen time, for <input type="date"> values and file names. */
export function isoDay(date: Date): string {
  return isoFormat.format(date);
}
