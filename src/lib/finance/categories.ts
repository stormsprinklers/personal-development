import type { FinanceCategoryKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SYSTEM_CATEGORIES: Array<{
  name: string;
  kind: FinanceCategoryKind;
  sortOrder: number;
}> = [
  { name: "Uncategorized", kind: "system", sortOrder: 0 },
  { name: "Income", kind: "income", sortOrder: 1 },
  { name: "Transfer", kind: "transfer", sortOrder: 2 },
  { name: "Credit Card Payment", kind: "transfer", sortOrder: 3 },
  { name: "Groceries", kind: "expense", sortOrder: 10 },
  { name: "Dining", kind: "expense", sortOrder: 11 },
  { name: "Transport", kind: "expense", sortOrder: 12 },
  { name: "Housing", kind: "expense", sortOrder: 13 },
  { name: "Utilities", kind: "expense", sortOrder: 14 },
  { name: "Subscriptions", kind: "expense", sortOrder: 15 },
  { name: "Shopping", kind: "expense", sortOrder: 16 },
  { name: "Entertainment", kind: "expense", sortOrder: 17 },
  { name: "Health", kind: "expense", sortOrder: 18 },
  { name: "Travel", kind: "expense", sortOrder: 19 },
  { name: "Personal Care", kind: "expense", sortOrder: 20 },
  { name: "Fees", kind: "expense", sortOrder: 21 },
  { name: "Other", kind: "expense", sortOrder: 99 },
];

/** Ensure the user has the default personal finance categories. */
export async function ensureFinanceCategories(userId: string) {
  const existing = await prisma.financeCategory.findMany({
    where: { userId },
    select: { name: true },
  });
  const have = new Set(existing.map((c) => c.name));
  const missing = SYSTEM_CATEGORIES.filter((c) => !have.has(c.name));
  if (missing.length) {
    await prisma.financeCategory.createMany({
      data: missing.map((c) => ({
        userId,
        name: c.name,
        kind: c.kind,
        isSystem: true,
        sortOrder: c.sortOrder,
      })),
    });
  }
  return prisma.financeCategory.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function categoryIdByName(userId: string, name: string): Promise<string | null> {
  const row = await prisma.financeCategory.findUnique({
    where: { userId_name: { userId, name } },
    select: { id: true },
  });
  return row?.id ?? null;
}
