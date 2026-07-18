"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GroupedRow } from "@/components/ui/grouped-row";
import type { NotificationPrefs } from "@/lib/models";
import {
  getCurrentPushSubscription,
  isStandalonePwa,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications/client";
import { DEFAULT_NOTIFICATION_PREFS, HOUR_OPTIONS, normalizeNotificationPrefs } from "@/lib/notifications/prefs";
import { useAppData } from "@/lib/storage";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <GroupedRow>
      <div className="flex items-start justify-between gap-3 py-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ios-label">{label}</p>
          <p className="mt-0.5 text-xs text-ios-secondary">{description}</p>
        </div>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5"
          style={{ accentColor: "var(--ios-tint)" }}
        />
      </div>
    </GroupedRow>
  );
}

function HourSelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (hour: number) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="ios-field mt-2 w-full px-3 py-2 text-sm"
    >
      {HOUR_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function NotificationsSettingsPanel() {
  const { data, setData } = useAppData();
  const prefs = useMemo(
    () => normalizeNotificationPrefs(data.notificationPrefs) ?? { ...DEFAULT_NOTIFICATION_PREFS },
    [data.notificationPrefs],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const standalone = isStandalonePwa();
  const supported = pushSupported();

  const refreshStatus = useCallback(async () => {
    if (!supported) {
      setPermission("unsupported");
      setSubscribed(false);
      return;
    }
    setPermission(Notification.permission);
    const sub = await getCurrentPushSubscription();
    setSubscribed(Boolean(sub));
  }, [supported]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  function patchPrefs(patch: Partial<NotificationPrefs>) {
    setData((prev) => {
      const current = normalizeNotificationPrefs(prev.notificationPrefs) ?? { ...DEFAULT_NOTIFICATION_PREFS };
      return { ...prev, notificationPrefs: { ...current, ...patch } };
    });
  }

  async function enablePush() {
    setBusy(true);
    setError(null);
    try {
      await subscribeToPush();
      patchPrefs({ enabled: true });
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setError(null);
    try {
      await unsubscribeFromPush();
      patchPrefs({ enabled: false });
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SectionCard title="Push notifications" inset>
        <GroupedRow>
          <p className="py-1 text-sm text-ios-secondary">
            On iPhone, open this site in Safari, tap Share → <span className="font-medium text-ios-label">Add to Home Screen</span>,
            then open the app from your home screen and enable notifications here. Web Push requires iOS 16.4+.
          </p>
        </GroupedRow>
        <GroupedRow>
          <div className="grid gap-1 py-1 text-sm">
            <p className="text-ios-label">
              Status:{" "}
              {!supported
                ? "Not supported in this browser"
                : subscribed && permission === "granted"
                  ? "Enabled on this device"
                  : permission === "denied"
                    ? "Blocked — check iOS Settings → Notifications"
                    : standalone
                      ? "Ready to enable"
                      : "Add to Home Screen first (Safari)"}
            </p>
            {!standalone && supported ? (
              <p className="text-xs text-ios-secondary">
                You can still enable from Safari on some devices, but iOS delivers push most reliably from the home-screen app.
              </p>
            ) : null}
          </div>
        </GroupedRow>
        <GroupedRow>
          <div className="flex flex-wrap gap-2 py-1">
            {prefs.enabled && subscribed ? (
              <GlassButton variant="secondary" disabled={busy} onClick={() => void disablePush()}>
                {busy ? "Working…" : "Turn off on this device"}
              </GlassButton>
            ) : (
              <GlassButton variant="primary" disabled={busy || !supported} onClick={() => void enablePush()}>
                {busy ? "Working…" : "Enable notifications"}
              </GlassButton>
            )}
          </div>
        </GroupedRow>
        {error ? (
          <GroupedRow>
            <p className="py-1 text-sm text-copper">{error}</p>
          </GroupedRow>
        ) : null}
      </SectionCard>

      <SectionCard title="Reminder types" inset>
        <ToggleRow
          label="Habit tracking reminders"
          description="Don't forget to track your habits today."
          checked={prefs.habitReminders}
          disabled={!prefs.enabled}
          onChange={(habitReminders) => patchPrefs({ habitReminders })}
        />
        {prefs.habitReminders ? (
          <GroupedRow>
            <label className="block py-1 text-xs font-medium text-ios-secondary">
              Habit reminder time (MST)
              <HourSelect
                value={prefs.habitReminderHour}
                disabled={!prefs.enabled}
                onChange={(habitReminderHour) => patchPrefs({ habitReminderHour })}
              />
            </label>
          </GroupedRow>
        ) : null}

        <ToggleRow
          label="AI motivational nudge"
          description="A one-sentence encouragement grounded in your goals and recent progress."
          checked={prefs.motivationalAi}
          disabled={!prefs.enabled}
          onChange={(motivationalAi) => patchPrefs({ motivationalAi })}
        />
        {prefs.motivationalAi ? (
          <GroupedRow>
            <label className="block py-1 text-xs font-medium text-ios-secondary">
              Motivational nudge time (MST)
              <HourSelect
                value={prefs.motivationalHour}
                disabled={!prefs.enabled}
                onChange={(motivationalHour) => patchPrefs({ motivationalHour })}
              />
            </label>
          </GroupedRow>
        ) : null}

        <ToggleRow
          label="Journal reminders"
          description="A gentle evening prompt if you haven't journaled yet."
          checked={prefs.journalReminders}
          disabled={!prefs.enabled}
          onChange={(journalReminders) => patchPrefs({ journalReminders })}
        />
        {prefs.journalReminders ? (
          <GroupedRow>
            <label className="block py-1 text-xs font-medium text-ios-secondary">
              Journal reminder time (MST)
              <HourSelect
                value={prefs.journalReminderHour}
                disabled={!prefs.enabled}
                onChange={(journalReminderHour) => patchPrefs({ journalReminderHour })}
              />
            </label>
          </GroupedRow>
        ) : null}
      </SectionCard>
    </div>
  );
}
