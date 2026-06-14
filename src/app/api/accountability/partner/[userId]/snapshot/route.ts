import { NextResponse } from "next/server";
import { canViewPartnerData } from "@/lib/accountability/access";
import { buildPartnerSnapshot } from "@/lib/accountability/partner-snapshot";
import { requireSession } from "@/lib/auth/require-session";
import { normalizeAppData } from "@/lib/normalize-app-data";
import { isValidDateKey, todayKey } from "@/lib/timezone";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { userId: ownerId } = await context.params;
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isValidDateKey(dateParam) ? dateParam : todayKey();

  const allowed = await canViewPartnerData(auth.session.userId, ownerId);
  if (!allowed) {
    return NextResponse.json({ error: "You do not have access to this partner's data." }, { status: 403 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, displayName: true },
  });
  if (!owner) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const row = await prisma.appDataStore.findUnique({ where: { userId: ownerId } });
  if (!row) {
    return NextResponse.json({ error: "No data for this user." }, { status: 404 });
  }

  const snapshot = buildPartnerSnapshot(
    normalizeAppData(row.payload),
    owner.displayName,
    owner.id,
    date,
  );

  return NextResponse.json({ snapshot });
}
