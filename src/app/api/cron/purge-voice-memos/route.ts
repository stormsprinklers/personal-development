import { del } from "@vercel/blob";
import { normalizeAppData } from "@/lib/normalize-app-data";
import type { AppData } from "@/lib/models";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function stripExpiredVoiceMemos(data: AppData, expiredIds: Set<string>): AppData {
  if (!expiredIds.size) return data;
  const journalEntries = data.journalEntries.map((entry) => {
    if (entry.voiceMemo && expiredIds.has(entry.voiceMemo.id)) {
      const { voiceMemo, ...rest } = entry;
      return rest;
    }
    return entry;
  });
  return { ...data, journalEntries };
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 500 });
  }

  const expired = await prisma.journalVoiceMemo.findMany({
    where: { expiresAt: { lt: new Date() } },
  });

  if (!expired.length) {
    return Response.json({ ok: true, deleted: 0 });
  }

  const expiredIds = new Set(expired.map((row) => row.id));
  const userIds = [...new Set(expired.map((row) => row.userId))];

  for (const row of expired) {
    try {
      await del(row.blobPathname, { token });
    } catch {
      // Blob may already be gone; continue cleanup.
    }
  }

  for (const userId of userIds) {
    const store = await prisma.appDataStore.findUnique({ where: { userId } });
    if (!store) continue;
    const data = normalizeAppData(store.payload);
    const userExpiredIds = new Set(expired.filter((row) => row.userId === userId).map((row) => row.id));
    const next = stripExpiredVoiceMemos(data, userExpiredIds);
    await prisma.appDataStore.update({
      where: { userId },
      data: { payload: next as object },
    });
  }

  await prisma.journalVoiceMemo.deleteMany({
    where: { id: { in: [...expiredIds] } },
  });

  return Response.json({ ok: true, deleted: expired.length });
}
