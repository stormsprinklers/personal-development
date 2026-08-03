import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const rules = await prisma.financeMerchantRule.findMany({
    where: { userId: auth.session.userId },
    include: {
      merchant: true,
      category: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      merchantId: r.merchantId,
      merchantName: r.merchant.displayName,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      flowType: r.flowType,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function DELETE(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const rule = await prisma.financeMerchantRule.findFirst({
    where: { id, userId: auth.session.userId },
  });
  if (!rule) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.financeMerchantRule.delete({ where: { id: rule.id } });
  return NextResponse.json({ ok: true });
}
