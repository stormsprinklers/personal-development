import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { plaidConfigured } from "@/lib/finance/plaid-client";
import { prisma } from "@/lib/prisma";
import { syncPlaidItem } from "@/lib/finance/sync";

type Body = { itemId?: string };

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Plaid is not configured." }, { status: 503 });
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Body;
  const items = body.itemId
    ? await prisma.financePlaidItem.findMany({
        where: { id: body.itemId, userId: auth.session.userId },
      })
    : await prisma.financePlaidItem.findMany({
        where: { userId: auth.session.userId, status: { not: "disconnected" } },
      });

  const results: Array<{ itemId: string; ok: boolean; error?: string }> = [];
  for (const item of items) {
    try {
      await syncPlaidItem(item.id);
      results.push({ itemId: item.id, ok: true });
    } catch (e) {
      results.push({
        itemId: item.id,
        ok: false,
        error: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  return NextResponse.json({ results });
}
