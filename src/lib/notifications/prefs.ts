import type { NotificationPrefs } from "@/lib/models";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  habitReminders: true,
  habitReminderHour: 20,
  motivationalAi: true,
  motivationalHour: 8,
  journalReminders: false,
  journalReminderHour: 21,
};

function clampHour(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(23, Math.round(n)));
}

export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Partial<NotificationPrefs>;
  return {
    enabled: row.enabled === true,
    habitReminders: row.habitReminders !== false,
    habitReminderHour: clampHour(row.habitReminderHour, DEFAULT_NOTIFICATION_PREFS.habitReminderHour),
    motivationalAi: row.motivationalAi !== false,
    motivationalHour: clampHour(row.motivationalHour, DEFAULT_NOTIFICATION_PREFS.motivationalHour),
    journalReminders: row.journalReminders === true,
    journalReminderHour: clampHour(row.journalReminderHour, DEFAULT_NOTIFICATION_PREFS.journalReminderHour),
  };
}

export function hourInAppTimezone(instant: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour: "numeric",
    hour12: false,
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  // Some engines emit "24" for midnight
  return hour === 24 ? 0 : hour;
}

export const HOUR_OPTIONS: { value: number; label: string }[] = Array.from({ length: 24 }, (_, hour) => {
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { value: hour, label: `${h12}:00 ${suffix}` };
});
