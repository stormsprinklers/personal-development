"use client";

import { useCallback, useEffect, useState } from "react";
import { FinanceShell } from "@/components/finance/finance-shell";
import { SectionCard } from "@/components/layout/section-card";
import { money } from "@/lib/finance/date-keys";

type PnlMonth = {
  month: string;
  income: number;
  expenses: number;
  transfers: number;
  ccPayments: number;
  other: number;
  net: number;
};

type PnlData = {
  year: number;
  months: PnlMonth[];
  totals: Omit<PnlMonth, "month">;
};

export default function FinancePnlPage() {
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [data, setData] = useState<PnlData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/finance/summary/pnl?year=${year}`);
      const json = (await res.json()) as PnlData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load P&L.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load P&L.");
    }
  }, [year]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <FinanceShell title="P&L" description="Personal cash-flow: income vs expenses by month.">
      <div className="grid gap-4">
        <label className="grid max-w-[10rem] gap-1 text-xs font-medium text-ios-secondary">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="ios-field px-3 py-2.5 text-sm"
          />
        </label>

        {error ? <p className="text-sm text-copper">{error}</p> : null}

        <SectionCard title="Cash flow" inset={false}>
          <p className="mb-3 text-sm text-ios-secondary">
            Transfers and credit-card payments are shown for context but excluded from Net (income −
            expenses).
          </p>
          {data ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ios-separator text-xs uppercase text-ios-secondary">
                    <th className="py-2 pr-2">Month</th>
                    <th className="py-2 pr-2 text-right">Income</th>
                    <th className="py-2 pr-2 text-right">Expenses</th>
                    <th className="py-2 pr-2 text-right">Transfers</th>
                    <th className="py-2 pr-2 text-right">CC payments</th>
                    <th className="py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.month} className="border-b border-ios-separator/50">
                      <td className="py-2 pr-2">{m.month}</td>
                      <td className="py-2 pr-2 text-right">{money(m.income)}</td>
                      <td className="py-2 pr-2 text-right">{money(m.expenses)}</td>
                      <td className="py-2 pr-2 text-right text-ios-secondary">{money(m.transfers)}</td>
                      <td className="py-2 pr-2 text-right text-ios-secondary">{money(m.ccPayments)}</td>
                      <td className="py-2 text-right font-semibold">{money(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2 pr-2">YTD</td>
                    <td className="py-2 pr-2 text-right">{money(data.totals.income)}</td>
                    <td className="py-2 pr-2 text-right">{money(data.totals.expenses)}</td>
                    <td className="py-2 pr-2 text-right text-ios-secondary">
                      {money(data.totals.transfers)}
                    </td>
                    <td className="py-2 pr-2 text-right text-ios-secondary">
                      {money(data.totals.ccPayments)}
                    </td>
                    <td className="py-2 text-right">{money(data.totals.net)}</td>
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
