import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      accountabilityCode: true,
    },
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
