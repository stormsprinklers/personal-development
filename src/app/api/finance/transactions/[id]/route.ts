import { NextResponse } from "next/server";
import type { FinanceFlowType, FinanceReviewStatus } from "@prisma/client";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { upsertMerchantRule } from "@/lib/finance/rules";

type Body = {
  categoryId?: string | null;
  flowType?: FinanceFlowType;
  reviewStatus?: FinanceReviewStatus;
  applyToMerchant?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await request.json()) as Body;

  const txn = await prisma.financeTransaction.findFirst({
    where: { id, userId: auth.session.userId },
  });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  if (body.categoryId) {
    const cat = await prisma.financeCategory.findFirst({
      where: { id: body.categoryId, userId: auth.session.userId },
    });
    if (!cat) {
      return NextResponse.json({ error: "Category not found." }, { status: 400 });
    }
  }

  const updated = await prisma.financeTransaction.update({
    where: { id: txn.id },
    data: {
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.flowType ? { flowType: body.flowType } : {}),
      reviewStatus: body.reviewStatus ?? "reviewed",
    },
    include: { account: true, category: true, merchant: true },
  });

  if (body.applyToMerchant && body.categoryId && updated.merchantId) {
    await upsertMerchantRule({
      userId: auth.session.userId,
      merchantId: updated.merchantId,
      categoryId: body.categoryId,
      flowType: body.flowType ?? updated.flowType,
    });
  }

  return NextResponse.json({
    transaction: {
      id: updated.id,
      date: updated.date.toISOString().slice(0, 10),
      merchant: updated.merchant?.displayName ?? updated.merchantName,
      description: updated.name,
      amount: Number(updated.amount),
      category: updated.category
        ? { id: updated.category.id, name: updated.category.name }
        : null,
      flowType: updated.flowType,
      reviewStatus: updated.reviewStatus,
      pending: updated.pending,
      account: {
        id: updated.account.id,
        name: updated.account.name,
        mask: updated.account.mask,
      },
    },
  });
}
