"use client";

import { useCallback, useEffect, useState } from "react";
import { FinanceShell } from "@/components/finance/finance-shell";
import { CategoryPieChart, IncomeExpenseChart } from "@/components/finance/finance-charts";
import { PlaidLinkButton } from "@/components/finance/plaid-link-button";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { monthKeyFromDate } from "@/lib/finance/date-keys";

type ChartsData = {
  year: number;
  incomeVsExpense: Array<{ month: string; income: number; expense: number }>;
  categoryPie: Array<{ name: string; amount: number; percent: number }>;
};

type SpendingData = {
  month: string;
  priorMonth: string;
  categories: Array<{
    name: string;
    amount: number;
    priorAmount: number;
    delta: number;
  }>;
  total: number;
  priorTotal: number;
};

export default function FinanceOverviewPage() {
  const year = new Date().getUTCFullYear();
  const [month, setMonth] = useState(() => monthKeyFromDate(new Date()));
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [spending, setSpending] = useState<SpendingData | null>(null);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [plaidConfigured, setPlaidConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [chartsRes, spendRes, acctRes] = await Promise.all([
        fetch(`/api/finance/summary/charts?year=${year}`),
        fetch(`/api/finance/summary/spending-by-category?month=${month}`),
        fetch("/api/finance/accounts"),
      ]);
      const chartsData = (await chartsRes.json()) as ChartsData & { error?: string };
      const spendData = (await spendRes.json()) as SpendingData & { error?: string };
      const acctData = (await acctRes.json()) as {
        plaidConfigured?: boolean;
        items?: unknown[];
        error?: string;
      };
      if (!chartsRes.ok) throw new Error(chartsData.error ?? "Could not load charts.");
      if (!spendRes.ok) throw new Error(spendData.error ?? "Could not load spending.");
      if (!acctRes.ok) throw new Error(acctData.error ?? "Could not load accounts.");
      setCharts(chartsData);
      setSpending(spendData);
      setHasAccounts(Boolean(acctData.items?.length));
      setPlaidConfigured(acctData.plaidConfigured !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load finance overview.");
    }
  }, [year, month]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  async function syncAll() {
    setSyncing(true);
    try {
      await fetch("/api/finance/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      await refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <FinanceShell>
      <div className="grid gap-5">
        <SectionCard title="Accounts" inset={false}>
          <div className="grid gap-3">
            {!plaidConfigured ? (
              <p className="text-sm text-copper">
                Plaid is not configured. Set PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV in your
                environment.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {plaidConfigured ? <PlaidLinkButton onLinked={() => void refresh()} /> : null}
              {hasAccounts ? (
                <GlassButton variant="secondary" disabled={syncing} onClick={() => void syncAll()}>
                  {syncing ? "Refreshing…" : "Refresh transactions"}
                </GlassButton>
              ) : null}
            </div>
            {!hasAccounts && plaidConfigured ? (
              <p className="text-sm text-ios-secondary">
                Connect a bank or credit card to start importing transactions.
              </p>
            ) : null}
          </div>
        </SectionCard>

        {error ? <p className="text-sm text-copper">{error}</p> : null}

        <SectionCard title={`Spending vs income (${year})`} inset={false}>
          <IncomeExpenseChart data={charts?.incomeVsExpense ?? []} />
        </SectionCard>

        <SectionCard title="Spending by category" inset={false}>
          <CategoryPieChart data={charts?.categoryPie ?? []} />
        </SectionCard>

        <SectionCard title="Category compare by month" inset={false}>
          <div className="mb-3">
            <label className="grid max-w-[12rem] gap-1 text-xs font-medium text-ios-secondary">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="ios-field px-3 py-2.5 text-sm"
              />
            </label>
          </div>
          {spending ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ios-separator text-xs uppercase text-ios-secondary">
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">{spending.month}</th>
                    <th className="py-2 pr-3 text-right">{spending.priorMonth}</th>
                    <th className="py-2 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {spending.categories.map((row) => (
                    <tr key={row.name} className="border-b border-ios-separator/50">
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3 text-right">
                        {row.amount.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {row.priorAmount.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })}
                      </td>
                      <td className="py-2 text-right">
                        {row.delta.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          signDisplay: "exceptZero",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="py-2 pr-3 text-right">
                      {spending.total.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {spending.priorTotal.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className="py-2 text-right">
                      {(spending.total - spending.priorTotal).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        signDisplay: "exceptZero",
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ios-secondary">Loading…</p>
          )}
        </SectionCard>
      </div>
    </FinanceShell>
  );
}
