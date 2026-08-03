import { NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/auth/require-session";
import { syncPlaidItemByPlaidItemId } from "@/lib/finance/sync";
import { prisma } from "@/lib/prisma";

/**
 * Plaid webhook receiver. Verifies lightly via item lookup; production can add JWT verification.
 * Responds quickly and syncs when SYNC_UPDATES_AVAILABLE fires.
 */
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
    error?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const itemId = body.item_id;
  if (!itemId) {
    return NextResponse.json({ ok: true });
  }

  if (body.webhook_type === "ITEM" && body.webhook_code === "ERROR") {
    await prisma.financePlaidItem.updateMany({
      where: { itemId },
      data: { status: "error" },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.webhook_type === "ITEM" && body.webhook_code === "PENDING_EXPIRATION") {
    await prisma.financePlaidItem.updateMany({
      where: { itemId },
      data: { status: "needs_reauth" },
    });
    return NextResponse.json({ ok: true });
  }

  if (
    body.webhook_type === "TRANSACTIONS" &&
    (body.webhook_code === "SYNC_UPDATES_AVAILABLE" ||
      body.webhook_code === "DEFAULT_UPDATE" ||
      body.webhook_code === "INITIAL_UPDATE" ||
      body.webhook_code === "HISTORICAL_UPDATE")
  ) {
    // Fire-and-forget style but await for serverless reliability
    try {
      await syncPlaidItemByPlaidItemId(itemId);
    } catch (e) {
      console.error("Webhook sync failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
