"use client";

/** Convert a base64url VAPID public key to a Uint8Array for PushManager.subscribe. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
  const payload = (await res.json()) as { publicKey?: string; error?: string };
  if (!res.ok || !payload.publicKey) throw new Error(payload.error ?? "Push is not configured on the server.");
  return payload.publicKey;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted. On iPhone, add this app to your Home Screen first, then enable notifications.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing);
    return existing;
  }

  const publicKey = await fetchVapidPublicKey();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  await saveSubscription(subscription);
  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return;
  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    }),
  });
  const payload = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(payload.error ?? "Could not save push subscription.");
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}
