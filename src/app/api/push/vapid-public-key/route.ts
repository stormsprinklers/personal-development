export const runtime = "nodejs";

import { getVapidPublicKey, vapidConfigured } from "@/lib/notifications/web-push";

export async function GET() {
  if (!vapidConfigured()) {
    return Response.json(
      { error: "Push notifications are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY." },
      { status: 503 },
    );
  }
  return Response.json({ publicKey: getVapidPublicKey() });
}
