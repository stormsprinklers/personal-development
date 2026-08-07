"use client";

import { useEffect } from "react";
import {
  applyNightShiftClass,
  normalizeNightShiftEnabled,
  writeNightShiftToStorage,
} from "@/lib/appearance";
import { useAppData } from "@/lib/storage";

/** Keeps the document theme class in sync with synced app preferences. */
export function NightShiftTheme() {
  const { data, ready } = useAppData();
  const enabled = normalizeNightShiftEnabled(data.nightShiftEnabled);

  useEffect(() => {
    if (!ready) return;
    applyNightShiftClass(enabled);
    writeNightShiftToStorage(enabled);
  }, [enabled, ready]);

  return null;
}
