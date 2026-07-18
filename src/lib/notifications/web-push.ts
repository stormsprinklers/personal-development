import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function getVapidPrivateKey(): string | null {
  return process.env.VAPID_PRIVATE_KEY?.trim() || null;
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT?.trim() || "mailto:support@personal-development.app";
}

export function vapidConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
}

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured.");
  }
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  vapidInitialized = true;
}

export async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; statusCode?: number; gone?: boolean; error: string }> {
  ensureVapid();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 12,
      urgency: "normal",
    });
    return { ok: true };
  } catch (e) {
    const statusCode =
      e && typeof e === "object" && "statusCode" in e ? Number((e as { statusCode?: number }).statusCode) : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    return {
      ok: false,
      statusCode,
      gone,
      error: e instanceof Error ? e.message : "Push send failed.",
    };
  }
}
