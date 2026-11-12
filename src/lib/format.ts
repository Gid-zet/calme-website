/** Display helpers shared by server and client components. */

export function formatMoney(minor: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
}

export function formatDateTime(d: Date | string, timeZone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(new Date(d));
}

export function formatDate(d: Date | string, timeZone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", ...opts }).format(new Date(d));
}

export function formatTime(d: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
}

export function relativeTime(d: Date | string, now = new Date()) {
  const diff = (new Date(d).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

export const MODE_LABEL = { online: "Video call", in_person: "In person" } as const;

export const STATUS_META = {
  pending: { label: "Awaiting confirmation", short: "Pending", bg: "var(--sun-soft)" },
  confirmed: { label: "Confirmed", short: "Confirmed", bg: "var(--mint-soft)" },
  declined: { label: "Declined", short: "Declined", bg: "var(--coral-soft)" },
  cancelled: { label: "Cancelled", short: "Cancelled", bg: "#eeeeee" },
  completed: { label: "Completed", short: "Completed", bg: "var(--blue-soft)" },
  no_show: { label: "No-show", short: "No-show", bg: "var(--lilac-soft)" },
} as const;

export const VERIFICATION_META = {
  pending: { label: "Under review", bg: "var(--sun-soft)" },
  needs_info: { label: "More information needed", bg: "var(--coral-soft)" },
  approved: { label: "Verified", bg: "var(--mint-soft)" },
  rejected: { label: "Not approved", bg: "#eeeeee" },
} as const;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
