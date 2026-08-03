import { NextResponse } from "next/server";
import type { FinanceFlowType, FinanceReviewStatus, Prisma } from "@prisma/client";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { ensureFinanceCategories } from "@/lib/finance/categories";

function serializeTxn(
  t: Prisma.FinanceTransactionGetPayload<{
    include: {
      account: true;
      category: true;
      merchant: true;
    };
  }>,
) {
  return {
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    authorizedDate: t.authorizedDate?.toISOString().slice(0, 10) ?? null,
    merchant: t.merchant?.displayName ?? t.merchantName ?? null,
    merchantId: t.merchantId,
    description: t.name,
    amount: Number(t.amount),
    currency: t.isoCurrencyCode,
    account: {
      id: t.account.id,
      name: t.account.name,
      mask: t.account.mask,
      type: t.account.type,
    },
    pending: t.pending,
    category: t.category
      ? { id: t.category.id, name: t.category.name, kind: t.category.kind }
      : null,
    flowType: t.flowType,
    reviewStatus: t.reviewStatus,
  };
}

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  await ensureFinanceCategories(auth.session.userId);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const accountId = searchParams.get("accountId")?.trim() || undefined;
  const categoryId = searchParams.get("categoryId")?.trim() || undefined;
  const flowType = searchParams.get("flowType")?.trim() as FinanceFlowType | undefined;
  const reviewStatus = searchParams.get("reviewStatus")?.trim() as FinanceReviewStatus | undefined;
  const pendingParam = searchParams.get("pending");
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? "50") || 50));

  const where: Prisma.FinanceTransactionWhereInput = {
    userId: auth.session.userId,
  };

  if (accountId) where.accountId = accountId;
  if (categoryId) where.categoryId = categoryId;
  if (flowType) where.flowType = flowType;
  if (reviewStatus) where.reviewStatus = reviewStatus;
  if (pendingParam === "true") where.pending = true;
  if (pendingParam === "false") where.pending = false;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { merchantName: { contains: q, mode: "insensitive" } },
      { merchant: { displayName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.financeTransaction.count({ where }),
    prisma.financeTransaction.findMany({
      where,
      include: { account: true, category: true, merchant: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    transactions: rows.map(serializeTxn),
  });
}
