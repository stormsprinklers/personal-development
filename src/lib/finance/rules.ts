import type { FinanceFlowType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { categoryIdByName, ensureFinanceCategories } from "@/lib/finance/categories";
import { classifyTransaction } from "@/lib/finance/classify";
import { displayMerchantName, normalizeMerchantKey } from "@/lib/finance/merchant";

export async function upsertMerchant(
  userId: string,
  merchantName: string | null | undefined,
  transactionName: string,
) {
  const display = displayMerchantName(merchantName, transactionName);
  const key = normalizeMerchantKey(display);
  if (!key) return null;

  return prisma.financeMerchant.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, displayName: display },
    update: { displayName: display },
  });
}

export async function applyMerchantRuleToPast(
  userId: string,
  merchantId: string,
  categoryId: string,
  flowType: FinanceFlowType | null | undefined,
) {
  const data: Prisma.FinanceTransactionUncheckedUpdateManyInput = {
    categoryId,
    reviewStatus: "reviewed",
  };
  if (flowType) data.flowType = flowType;

  await prisma.financeTransaction.updateMany({
    where: { userId, merchantId },
    data,
  });
}

export async function upsertMerchantRule(args: {
  userId: string;
  merchantId: string;
  categoryId: string;
  flowType?: FinanceFlowType | null;
}) {
  const rule = await prisma.financeMerchantRule.upsert({
    where: { merchantId: args.merchantId },
    create: {
      userId: args.userId,
      merchantId: args.merchantId,
      categoryId: args.categoryId,
      flowType: args.flowType ?? null,
    },
    update: {
      categoryId: args.categoryId,
      flowType: args.flowType ?? null,
    },
  });
  await applyMerchantRuleToPast(args.userId, args.merchantId, args.categoryId, args.flowType);
  return rule;
}

type RuleCache = Map<
  string,
  { categoryId: string; categoryName: string; flowType: FinanceFlowType | null }
>;

export async function loadMerchantRuleCache(userId: string): Promise<RuleCache> {
  const rules = await prisma.financeMerchantRule.findMany({
    where: { userId },
    include: { merchant: true, category: true },
  });
  const map: RuleCache = new Map();
  for (const r of rules) {
    map.set(r.merchant.key, {
      categoryId: r.categoryId,
      categoryName: r.category.name,
      flowType: r.flowType,
    });
  }
  return map;
}

export async function resolveCategoryAndFlow(args: {
  userId: string;
  amount: number;
  accountType: string;
  accountSubtype: string | null;
  pending: boolean;
  transferId: string | null;
  paymentChannel: string | null;
  plaidPfcPrimary: string | null;
  plaidPfcDetailed: string | null;
  name: string;
  merchantName: string | null;
  merchantKey: string;
  ruleCache: RuleCache;
  categoryNameToId: Map<string, string>;
}): Promise<{ categoryId: string | null; flowType: FinanceFlowType; reviewStatus: "needs_review" | "reviewed" }> {
  const rule = args.merchantKey ? args.ruleCache.get(args.merchantKey) : undefined;
  const classified = classifyTransaction({
    amount: args.amount,
    accountType: args.accountType,
    accountSubtype: args.accountSubtype,
    pending: args.pending,
    transferId: args.transferId,
    paymentChannel: args.paymentChannel,
    plaidPfcPrimary: args.plaidPfcPrimary,
    plaidPfcDetailed: args.plaidPfcDetailed,
    name: args.name,
    merchantName: args.merchantName,
    ruleFlowType: rule?.flowType,
    ruleCategoryName: rule?.categoryName,
  });

  let categoryId =
    rule?.categoryId ??
    args.categoryNameToId.get(classified.suggestedCategoryName) ??
    (await categoryIdByName(args.userId, classified.suggestedCategoryName));

  if (!categoryId) {
    categoryId = args.categoryNameToId.get("Uncategorized") ?? null;
  }

  const reviewStatus: "needs_review" | "reviewed" =
    rule || classified.flowType === "transfer" || classified.flowType === "cc_payment"
      ? "reviewed"
      : args.pending || classified.suggestedCategoryName === "Uncategorized"
        ? "needs_review"
        : "needs_review";

  return {
    categoryId,
    flowType: classified.flowType,
    reviewStatus: rule ? "reviewed" : reviewStatus,
  };
}

export async function buildCategoryNameMap(userId: string) {
  await ensureFinanceCategories(userId);
  const cats = await prisma.financeCategory.findMany({ where: { userId } });
  return new Map(cats.map((c) => [c.name, c.id]));
}
