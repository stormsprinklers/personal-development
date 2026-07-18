export const runtime = "nodejs";

import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return Response.json({ error: "Endpoint is required." }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: auth.session.userId, endpoint },
  });

  return Response.json({ ok: true });
}
