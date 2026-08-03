import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { getSpendingByCategory, monthKeyFromDate } from "@/lib/finance/aggregates";

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const month =
    new URL(request.url).searchParams.get("month")?.trim() ||
    monthKeyFromDate(new Date());

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM." }, { status: 400 });
  }

  const summary = await getSpendingByCategory(auth.session.userId, month);
  return NextResponse.json(summary);
}
