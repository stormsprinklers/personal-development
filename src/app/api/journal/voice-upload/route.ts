import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireSession } from "@/lib/auth/require-session";
import { isVoiceMemoPathForUser, VOICE_MEMO_MAX_BYTES } from "@/lib/journal/voice-memo";

export const runtime = "nodejs";

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "video/webm",
];

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body: body as HandleUploadBody,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        if (!isVoiceMemoPathForUser(pathname, auth.session.userId)) {
          throw new Error("Invalid voice memo upload path.");
        }
        return {
          allowedContentTypes: ALLOWED_AUDIO_TYPES,
          maximumSizeInBytes: VOICE_MEMO_MAX_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
