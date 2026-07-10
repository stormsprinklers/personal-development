import { NextResponse } from "next/server";
import { getSessionFromCookies, type SessionPayload } from "@/lib/auth/session";

export async function requireSession(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function sessionConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET?.trim() || process.env.APP_SYNC_KEY?.trim());
}
