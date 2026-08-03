import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { ensureFinanceCategories } from "@/lib/finance/categories";
import { getPlaidClient, plaidConfigured } from "@/lib/finance/plaid-client";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  await ensureFinanceCategories(auth.session.userId);

  const items = await prisma.financePlaidItem.findMany({
    where: { userId: auth.session.userId },
    include: {
      accounts: { orderBy: { name: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    plaidConfigured: plaidConfigured(),
    items: items.map((item) => ({
      id: item.id,
      institutionName: item.institutionName,
      status: item.status,
      lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null,
      accounts: item.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        officialName: a.officialName,
        mask: a.mask,
        type: a.type,
        subtype: a.subtype,
        isoCurrencyCode: a.isoCurrencyCode,
      })),
    })),
  });
}

export async function DELETE(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId")?.trim();
  if (!itemId) {
    return NextResponse.json({ error: "itemId is required." }, { status: 400 });
  }

  const item = await prisma.financePlaidItem.findFirst({
    where: { id: itemId, userId: auth.session.userId },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  if (plaidConfigured()) {
    try {
      const client = getPlaidClient();
      await client.itemRemove({ access_token: item.accessToken });
    } catch (e) {
      console.error("Plaid itemRemove failed", e);
    }
  }

  await prisma.financePlaidItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
