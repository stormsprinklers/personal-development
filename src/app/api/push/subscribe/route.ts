export const runtime = "nodejs";

import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const authKey = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !authKey) {
    return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: auth.session.userId,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : undefined,
    },
    update: {
      userId: auth.session.userId,
      p256dh,
      auth: authKey,
      userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : undefined,
    },
  });

  return Response.json({ ok: true });
}
