import { monthKeyFromDate } from "@/lib/finance/date-keys";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MonthKey = string; // YYYY-MM
export { monthKeyFromDate };

function toNumber(value: Prisma.Decimal | number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function ytdMonthKeys(year: number, throughMonth = 11): MonthKey[] {
  const keys: MonthKey[] = [];
  for (let m = 0; m <= throughMonth; m++) {
    keys.push(`${year}-${String(m + 1).padStart(2, "0")}`);
  }
  return keys;
}

export async function getChartsSummary(userId: string, year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const rows = await prisma.financeTransaction.findMany({
    where: {
      userId,
      pending: false,
      date: { gte: start, lt: end },
    },
    select: {
      date: true,
      amount: true,
      flowType: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  const monthly = new Map<MonthKey, { income: number; expense: number }>();
  for (const key of ytdMonthKeys(year, new Date().getUTCFullYear() === year ? new Date().getUTCMonth() : 11)) {
    monthly.set(key, { income: 0, expense: 0 });
  }

  const categorySpend = new Map<string, number>();

  for (const row of rows) {
    const key = monthKeyFromDate(row.date);
    const bucket = monthly.get(key) ?? { income: 0, expense: 0 };
    const amt = Math.abs(toNumber(row.amount));
    if (row.flowType === "income") {
      bucket.income += amt;
    } else if (row.flowType === "expense") {
      bucket.expense += amt;
      const catName = row.category?.name ?? "Uncategorized";
      categorySpend.set(catName, (categorySpend.get(catName) ?? 0) + amt);
    }
    monthly.set(key, bucket);
  }

  const incomeVsExpense = [...monthly.entries()].map(([month, v]) => ({
    month,
    income: Math.round(v.income * 100) / 100,
    expense: Math.round(v.expense * 100) / 100,
  }));

  const totalExpense = [...categorySpend.values()].reduce((a, b) => a + b, 0);
  const categoryPie = [...categorySpend.entries()]
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100,
      percent: totalExpense ? Math.round((amount / totalExpense) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { year, incomeVsExpense, categoryPie, totalExpense };
}

export async function getSpendingByCategory(userId: string, month: MonthKey) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 1));
  const prevStart = new Date(Date.UTC(y!, m! - 2, 1));
  const prevMonthKey = monthKeyFromDate(prevStart);

  async function aggregate(from: Date, to: Date) {
    const rows = await prisma.financeTransaction.findMany({
      where: {
        userId,
        pending: false,
        flowType: "expense",
        date: { gte: from, lt: to },
      },
      select: {
        amount: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
    });
    const map = new Map<string, { categoryId: string | null; name: string; amount: number }>();
    for (const row of rows) {
      const id = row.categoryId ?? "_none";
      const name = row.category?.name ?? "Uncategorized";
      const prev = map.get(id) ?? { categoryId: row.categoryId, name, amount: 0 };
      prev.amount += Math.abs(toNumber(row.amount));
      map.set(id, prev);
    }
    return [...map.values()].map((r) => ({
      ...r,
      amount: Math.round(r.amount * 100) / 100,
    }));
  }

  const current = await aggregate(start, end);
  const prior = await aggregate(prevStart, start);
  const priorByName = new Map(prior.map((p) => [p.name, p.amount]));

  const categories = current
    .map((c) => ({
      ...c,
      priorAmount: priorByName.get(c.name) ?? 0,
      delta: Math.round((c.amount - (priorByName.get(c.name) ?? 0)) * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Include prior-only categories with 0 current
  for (const p of prior) {
    if (!categories.some((c) => c.name === p.name)) {
      categories.push({
        ...p,
        amount: 0,
        priorAmount: p.amount,
        delta: -p.amount,
      });
    }
  }

  return {
    month,
    priorMonth: prevMonthKey,
    categories,
    total: Math.round(categories.reduce((s, c) => s + c.amount, 0) * 100) / 100,
    priorTotal: Math.round(prior.reduce((s, c) => s + c.amount, 0) * 100) / 100,
  };
}

export async function getPnlSummary(userId: string, year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await prisma.financeTransaction.findMany({
    where: {
      userId,
      pending: false,
      date: { gte: start, lt: end },
    },
    select: { date: true, amount: true, flowType: true },
  });

  const through =
    new Date().getUTCFullYear() === year ? new Date().getUTCMonth() : 11;
  const months = ytdMonthKeys(year, through).map((month) => ({
    month,
    income: 0,
    expenses: 0,
    transfers: 0,
    ccPayments: 0,
    other: 0,
    net: 0,
  }));
  const byMonth = new Map(months.map((m) => [m.month, m]));

  for (const row of rows) {
    const key = monthKeyFromDate(row.date);
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    const amt = Math.abs(toNumber(row.amount));
    switch (row.flowType) {
      case "income":
        bucket.income += amt;
        break;
      case "expense":
        bucket.expenses += amt;
        break;
      case "transfer":
        bucket.transfers += amt;
        break;
      case "cc_payment":
        bucket.ccPayments += amt;
        break;
      default:
        bucket.other += amt;
    }
  }

  for (const m of months) {
    m.income = Math.round(m.income * 100) / 100;
    m.expenses = Math.round(m.expenses * 100) / 100;
    m.transfers = Math.round(m.transfers * 100) / 100;
    m.ccPayments = Math.round(m.ccPayments * 100) / 100;
    m.other = Math.round(m.other * 100) / 100;
    m.net = Math.round((m.income - m.expenses) * 100) / 100;
  }

  const totals = months.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      transfers: acc.transfers + m.transfers,
      ccPayments: acc.ccPayments + m.ccPayments,
      other: acc.other + m.other,
      net: acc.net + m.net,
    }),
    { income: 0, expenses: 0, transfers: 0, ccPayments: 0, other: 0, net: 0 },
  );

  return { year, months, totals };
}
