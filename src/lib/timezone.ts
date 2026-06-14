/** US Mountain Standard Time (UTC−7, no daylight saving). */
export const APP_TIMEZONE = "America/Phoenix";

export const APP_TIMEZONE_LABEL = "MST";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** True when `dateKey` is a valid `YYYY-MM-DD` calendar date. */
export function isValidDateKey(dateKey: string): boolean {
  if (!DATE_KEY_RE.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** Calendar date `YYYY-MM-DD` in US Mountain Standard Time. */
export function dateKeyInAppTimezone(instant: Date = new Date()): string {
  return dateKeyFormatter.format(instant);
}

export function todayKey(): string {
  return dateKeyInAppTimezone();
}

export function yearInAppTimezone(instant: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, year: "numeric" }).format(instant),
  );
}

/** Calendar date from an ISO timestamp, in US Mountain Standard Time. */
export function dateKeyFromIsoTimestamp(iso: string): string {
  return dateKeyInAppTimezone(new Date(iso));
}

/** 0 = Sunday, 6 = Saturday (in app timezone). */
export function weekdayInAppTimezone(dateKey: string): number {
  if (!isValidDateKey(dateKey)) return 0;
  const instant = instantNoonForDateKey(dateKey);
  const name = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, weekday: "short" }).format(instant);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[name] ?? 0;
}

/** Noon on `dateKey` in app timezone, as a UTC instant (for formatting and day math). */
export function instantNoonForDateKey(dateKey: string): Date {
  if (!isValidDateKey(dateKey)) return new Date();
  const [year, month, day] = dateKey.split("-").map(Number);
  const lo = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  const hi = Date.UTC(year, month - 1, day + 1, 23, 59, 59);
  for (let t = lo; t <= hi; t += 3600000) {
    if (dateKeyInAppTimezone(new Date(t)) !== dateKey) continue;
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: APP_TIMEZONE,
        hour: "numeric",
        hour12: false,
      }).format(new Date(t)),
    );
    if (hour === 12) return new Date(t);
  }
  return new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  if (!isValidDateKey(dateKey)) return todayKey();
  const instant = instantNoonForDateKey(dateKey);
  return dateKeyInAppTimezone(new Date(instant.getTime() + days * 86400000));
}

export function formatDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  },
): string {
  if (!isValidDateKey(dateKey)) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, ...options }).format(
    instantNoonForDateKey(dateKey),
  );
}

export function dayOfMonthInAppTimezone(dateKey: string): number {
  if (!isValidDateKey(dateKey)) return 1;
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, day: "numeric" }).format(
      instantNoonForDateKey(dateKey),
    ),
  );
}

/** Format an ISO timestamp for display in US Mountain Standard Time. */
export function formatIsoTimestamp(iso: string): string {
  // dateStyle/timeStyle cannot be combined with timeZoneName (throws "Invalid option : option").
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Current date and time in US Mountain Standard Time. */
export function formatNowInAppTimezone(
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  },
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, ...options }).format(new Date());
}

/** Monday-start week containing `dateKey`. */
export function startOfWeekDateKey(dateKey: string): string {
  if (!isValidDateKey(dateKey)) return todayKey();
  const day = weekdayInAppTimezone(dateKey);
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysToDateKey(dateKey, diff);
}
