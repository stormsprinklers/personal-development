"use client";

import { FinanceShell } from "@/components/finance/finance-shell";
import { TransactionFeed } from "@/components/finance/transaction-feed";

export default function FinanceTransactionsPage() {
  return (
    <FinanceShell title="Transactions" description="Search, filter, and categorize your activity.">
      <TransactionFeed />
    </FinanceShell>
  );
}
