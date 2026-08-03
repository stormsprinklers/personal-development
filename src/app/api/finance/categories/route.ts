import { NextResponse } from "next/server";
import type { FinanceCategoryKind } from "@prisma/client";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { ensureFinanceCategories } from "@/lib/finance/categories";

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const categories = await ensureFinanceCategories(auth.session.userId);
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      isSystem: c.isSystem,
      sortOrder: c.sortOrder,
    })),
  });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  await ensureFinanceCategories(auth.session.userId);

  const body = (await request.json()) as { name?: string; kind?: FinanceCategoryKind };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const cat = await prisma.financeCategory.create({
      data: {
        userId: auth.session.userId,
        name,
        kind: body.kind ?? "expense",
        isSystem: false,
        sortOrder: 50,
      },
    });
    return NextResponse.json({
      category: {
        id: cat.id,
        name: cat.name,
        kind: cat.kind,
        isSystem: cat.isSystem,
      },
    });
  } catch {
    return NextResponse.json({ error: "Category already exists." }, { status: 409 });
  }
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

  const cat = await prisma.financeCategory.findFirst({
    where: { id, userId: auth.session.userId },
  });
  if (!cat) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (cat.isSystem) {
    return NextResponse.json({ error: "System categories cannot be deleted." }, { status: 400 });
  }

  const uncategorized = await prisma.financeCategory.findUnique({
    where: { userId_name: { userId: auth.session.userId, name: "Uncategorized" } },
  });
  if (uncategorized) {
    await prisma.financeTransaction.updateMany({
      where: { userId: auth.session.userId, categoryId: cat.id },
      data: { categoryId: uncategorized.id },
    });
  }

  await prisma.financeMerchantRule.deleteMany({ where: { categoryId: cat.id } });
  await prisma.financeCategory.delete({ where: { id: cat.id } });
  return NextResponse.json({ ok: true });
}
