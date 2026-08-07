"use client";

import { SectionCard } from "@/components/layout/section-card";
import { GroupedRow } from "@/components/ui/grouped-row";
import {
  applyNightShiftClass,
  normalizeNightShiftEnabled,
  writeNightShiftToStorage,
} from "@/lib/appearance";
import { useAppData } from "@/lib/storage";

export function AppearanceSettingsCard() {
  const { data, setData } = useAppData();
  const enabled = normalizeNightShiftEnabled(data.nightShiftEnabled);

  function setNightShift(next: boolean) {
    applyNightShiftClass(next);
    writeNightShiftToStorage(next);
    setData((prev) => ({ ...prev, nightShiftEnabled: next }));
  }

  return (
    <SectionCard title="Appearance" inset={false}>
      <div className="ios-card overflow-hidden">
        <GroupedRow hairline={false}>
          <label className="flex cursor-pointer items-start justify-between gap-3 py-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ios-label">Night Shift</p>
              <p className="mt-0.5 text-xs text-ios-secondary">
                Use a dark color palette that&apos;s easier on the eyes in low light.
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setNightShift(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
              style={{ accentColor: "var(--ios-tint)" }}
              aria-label="Night Shift"
            />
          </label>
        </GroupedRow>
      </div>
    </SectionCard>
  );
}
