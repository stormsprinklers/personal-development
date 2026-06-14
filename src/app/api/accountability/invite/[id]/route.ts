import { NextResponse } from "next/server";
import { getAccountabilityInvitePreview } from "@/lib/accountability/invite";
import { databaseConfigured } from "@/lib/auth/require-session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  const { id } = await context.params;
  const preview = await getAccountabilityInvitePreview(id);
  return NextResponse.json(preview);
}
