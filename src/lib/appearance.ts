/** Mirrors `AppData.nightShiftEnabled` for a pre-hydration flash-free apply. */
export const NIGHT_SHIFT_STORAGE_KEY = "pd-hub-night-shift";

export function normalizeNightShiftEnabled(raw: unknown): boolean {
  return raw === true;
}

export function readNightShiftFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NIGHT_SHIFT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeNightShiftToStorage(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NIGHT_SHIFT_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Quota / private mode — ignore; synced app data still wins after load.
  }
}

export function applyNightShiftClass(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("night-shift", enabled);
  document.documentElement.style.colorScheme = enabled ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", enabled ? "#000000" : "#0A84FF");
  }
  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBar) {
    statusBar.setAttribute("content", enabled ? "black-translucent" : "default");
  }
}

/** Inline boot script: apply night shift before first paint when mirrored in localStorage. */
export const NIGHT_SHIFT_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(NIGHT_SHIFT_STORAGE_KEY)})==="1"){document.documentElement.classList.add("night-shift");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;
