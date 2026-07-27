/**
 * The store operates in Argentina (UTC-3, no DST), so calendar dates typed in
 * the admin are anchored there instead of to the server's timezone — otherwise
 * a coupon set to expire on the 31st would die at 21:00 on the 30th once
 * deployed to a UTC server.
 */
const STORE_TIME_ZONE = "America/Argentina/Buenos_Aires";
const STORE_UTC_OFFSET = "-03:00";

function parseDayInput(value: string | null | undefined, time: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T${time}${STORE_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-12-31" → the first instant of that day in the store's timezone. */
export function startOfStoreDay(value?: string | null): Date | null {
  return parseDayInput(value, "00:00:00.000");
}

/** "2026-12-31" → the last instant of that day, so it stays valid all day. */
export function endOfStoreDay(value?: string | null): Date | null {
  return parseDayInput(value, "23:59:59.999");
}

/** Date → "YYYY-MM-DD" in the store's timezone, for `<input type="date">`. */
export function toDateInputValue(date?: Date | null): string {
  // en-CA renders as YYYY-MM-DD.
  return date ? date.toLocaleDateString("en-CA", { timeZone: STORE_TIME_ZONE }) : "";
}

/** Date → "31/12/2026" in the store's timezone. */
export function formatStoreDate(date?: Date | null): string {
  return date ? date.toLocaleDateString("es-AR", { timeZone: STORE_TIME_ZONE }) : "–";
}

/** Date → "31/12/2026, 21:05" in the store's timezone. */
export function formatStoreDateTime(date?: Date | null): string {
  return date
    ? date.toLocaleString("es-AR", {
        timeZone: STORE_TIME_ZONE,
        dateStyle: "short",
        timeStyle: "short",
      })
    : "–";
}
