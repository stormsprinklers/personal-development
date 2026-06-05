import { normalizeAppData } from "@/lib/normalize-app-data";
import { prisma } from "@/lib/prisma";
import { syncKeyFromRequest, validateSyncKey } from "@/lib/sync-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const auth = validateSyncKey(syncKeyFromRequest(request));
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.error.includes("required") ? 401 : 403 });

  const row = await prisma.appDataStore.findUnique({ where: { syncKey: auth.key } });
  if (!row) {
    return Response.json({ data: null, updatedAt: null });
  }

  return Response.json({
    data: normalizeAppData(row.payload),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const auth = validateSyncKey(syncKeyFromRequest(request));
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.error.includes("required") ? 401 : 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body && typeof body === "object" && "data" in body ? (body as { data: unknown }).data : body;
  const normalized = normalizeAppData(payload);

  const row = await prisma.appDataStore.upsert({
    where: { syncKey: auth.key },
    create: { syncKey: auth.key, payload: normalized as object },
    update: { payload: normalized as object },
  });

  return Response.json({ ok: true, updatedAt: row.updatedAt.toISOString() });
}
