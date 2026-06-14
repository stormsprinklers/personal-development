import { normalizeAppData } from "@/lib/normalize-app-data";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const row = await prisma.appDataStore.findUnique({ where: { userId: auth.session.userId } });
  if (!row) {
    return Response.json({ data: null, updatedAt: null });
  }

  return Response.json({
    data: normalizeAppData(row.payload),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PUT(request: Request) {
  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body && typeof body === "object" && "data" in body ? (body as { data: unknown }).data : body;
  const normalized = normalizeAppData(payload);

  const row = await prisma.appDataStore.upsert({
    where: { userId: auth.session.userId },
    create: { userId: auth.session.userId, payload: normalized as object },
    update: { payload: normalized as object },
  });

  return Response.json({ ok: true, updatedAt: row.updatedAt.toISOString() });
}
