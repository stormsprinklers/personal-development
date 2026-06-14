import { get } from "@vercel/blob";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { isVoiceMemoPathForUser, voiceMemoExpiresAt } from "@/lib/journal/voice-memo";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type TranscribeRequest = {
  blobUrl?: string;
  pathname?: string;
};

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!databaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 500 });
  }

  let body: TranscribeRequest;
  try {
    body = (await request.json()) as TranscribeRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const blobUrl = body.blobUrl?.trim();
  const pathname = body.pathname?.trim();
  if (!blobUrl || !pathname) {
    return Response.json({ error: "blobUrl and pathname are required." }, { status: 400 });
  }

  if (!isVoiceMemoPathForUser(pathname, auth.session.userId)) {
    return Response.json({ error: "Invalid voice memo path." }, { status: 403 });
  }

  const blobResult = await get(pathname, { access: "private", token });
  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return Response.json({ error: "Could not read uploaded audio." }, { status: 404 });
  }

  const audioBuffer = Buffer.from(await new Response(blobResult.stream).arrayBuffer());
  const contentType = blobResult.blob.contentType || "audio/webm";
  const extension = contentType.includes("mp4") ? "m4a" : contentType.includes("mpeg") ? "mp3" : "webm";

  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: contentType }), `memo.${extension}`);
  form.append("model", "whisper-1");

  const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    return Response.json({ error: errorText || "Transcription failed." }, { status: whisperResponse.status });
  }

  const whisperPayload = (await whisperResponse.json()) as { text?: string };
  const transcript = whisperPayload.text?.trim() ?? "";
  if (!transcript) {
    return Response.json({ error: "No transcript returned." }, { status: 422 });
  }

  const recordedAt = new Date();
  const expiresAt = voiceMemoExpiresAt(recordedAt);
  const voiceMemo = await prisma.journalVoiceMemo.create({
    data: {
      userId: auth.session.userId,
      blobUrl,
      blobPathname: pathname,
      recordedAt,
      expiresAt,
    },
  });

  return Response.json({
    transcript,
    voiceMemo: {
      id: voiceMemo.id,
      expiresAt: voiceMemo.expiresAt.toISOString(),
    },
  });
}
