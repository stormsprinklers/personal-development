import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type LinkRequest = {
  voiceMemoId?: string;
  journalEntryId?: string;
};

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  let body: LinkRequest;
  try {
    body = (await request.json()) as LinkRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const voiceMemoId = body.voiceMemoId?.trim();
  const journalEntryId = body.journalEntryId?.trim();
  if (!voiceMemoId || !journalEntryId) {
    return Response.json({ error: "voiceMemoId and journalEntryId are required." }, { status: 400 });
  }

  const memo = await prisma.journalVoiceMemo.findUnique({ where: { id: voiceMemoId } });
  if (!memo || memo.userId !== auth.session.userId) {
    return Response.json({ error: "Voice memo not found." }, { status: 404 });
  }

  await prisma.journalVoiceMemo.update({
    where: { id: voiceMemoId },
    data: { journalEntryId },
  });

  return Response.json({ ok: true });
}
