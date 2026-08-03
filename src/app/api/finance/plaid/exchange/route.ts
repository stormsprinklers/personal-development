import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { getPlaidClient, plaidConfigured } from "@/lib/finance/plaid-client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceCategories } from "@/lib/finance/categories";
import { syncPlaidItem } from "@/lib/finance/sync";

type Body = {
  public_token?: string;
  institution?: { institution_id?: string; name?: string } | null;
};

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Plaid is not configured." }, { status: 503 });
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as Body;
  const publicToken = body.public_token?.trim();
  if (!publicToken) {
    return NextResponse.json({ error: "public_token is required." }, { status: 400 });
  }

  await ensureFinanceCategories(auth.session.userId);

  const client = getPlaidClient();
  const exchange = await client.itemPublicTokenExchange({ public_token: publicToken });
  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  const item = await prisma.financePlaidItem.upsert({
    where: { itemId },
    create: {
      userId: auth.session.userId,
      itemId,
      accessToken,
      institutionId: body.institution?.institution_id ?? null,
      institutionName: body.institution?.name ?? null,
      status: "active",
    },
    update: {
      accessToken,
      institutionId: body.institution?.institution_id ?? undefined,
      institutionName: body.institution?.name ?? undefined,
      status: "active",
    },
  });

  try {
    await syncPlaidItem(item.id);
  } catch (e) {
    console.error("Initial Plaid sync failed", e);
    return NextResponse.json({
      itemId: item.id,
      warning: "Linked, but initial sync failed. Try Refresh.",
    });
  }

  return NextResponse.json({ itemId: item.id, ok: true });
}
