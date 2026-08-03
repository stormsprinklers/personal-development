import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { getChartsSummary } from "@/lib/finance/aggregates";

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const summary = await getChartsSummary(auth.session.userId, year);
  return NextResponse.json(summary);
}
