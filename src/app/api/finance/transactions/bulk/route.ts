import { NextResponse } from "next/server";
import type { FinanceFlowType, FinanceReviewStatus } from "@prisma/client";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { upsertMerchantRule } from "@/lib/finance/rules";

type Body = {
  ids?: string[];
  categoryId?: string | null;
  flowType?: FinanceFlowType;
  reviewStatus?: FinanceReviewStatus;
  applyToMerchant?: boolean;
};

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as Body;
  const ids = (body.ids ?? []).filter(Boolean);
  if (!ids.length) {
    return NextResponse.json({ error: "ids are required." }, { status: 400 });
  }

  if (body.categoryId) {
    const cat = await prisma.financeCategory.findFirst({
      where: { id: body.categoryId, userId: auth.session.userId },
    });
    if (!cat) {
      return NextResponse.json({ error: "Category not found." }, { status: 400 });
    }
  }

  const result = await prisma.financeTransaction.updateMany({
    where: { userId: auth.session.userId, id: { in: ids } },
    data: {
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.flowType ? { flowType: body.flowType } : {}),
      ...(body.reviewStatus
        ? { reviewStatus: body.reviewStatus }
        : body.categoryId
          ? { reviewStatus: "reviewed" }
          : {}),
    },
  });

  if (body.applyToMerchant && body.categoryId) {
    const txns = await prisma.financeTransaction.findMany({
      where: { userId: auth.session.userId, id: { in: ids }, merchantId: { not: null } },
      select: { merchantId: true, flowType: true },
    });
    const seen = new Set<string>();
    for (const t of txns) {
      if (!t.merchantId || seen.has(t.merchantId)) continue;
      seen.add(t.merchantId);
      await upsertMerchantRule({
        userId: auth.session.userId,
        merchantId: t.merchantId,
        categoryId: body.categoryId,
        flowType: body.flowType ?? t.flowType,
      });
    }
  }

  return NextResponse.json({ updated: result.count });
}
