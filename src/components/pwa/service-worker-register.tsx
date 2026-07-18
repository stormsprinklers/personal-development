"use client";

import { useEffect } from "react";

const SW_PATH = "/sw.js";

/** Registers the PWA service worker once after sign-in (needed for iOS Web Push). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    void (async () => {
      try {
        await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
        if (!cancelled) {
          // Ensure an active worker is ready for push subscription.
          await navigator.serviceWorker.ready;
        }
      } catch (e) {
        console.warn("Service worker registration failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
