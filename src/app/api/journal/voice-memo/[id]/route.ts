import { get } from "@vercel/blob";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { isVoiceMemoExpired } from "@/lib/journal/voice-memo";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 500 });
  }

  const { id } = await params;
  const memo = await prisma.journalVoiceMemo.findUnique({ where: { id } });
  if (!memo || memo.userId !== auth.session.userId) {
    return Response.json({ error: "Voice memo not found." }, { status: 404 });
  }

  if (isVoiceMemoExpired(memo.expiresAt)) {
    return Response.json({ error: "Voice memo has expired." }, { status: 410 });
  }

  const blobResult = await get(memo.blobPathname, { access: "private", token });
  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return Response.json({ error: "Audio file not found." }, { status: 404 });
  }

  return new Response(blobResult.stream, {
    headers: {
      "Content-Type": blobResult.blob.contentType || "audio/webm",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
