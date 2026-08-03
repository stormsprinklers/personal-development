export const FINANCE_TABS = [
  { id: "overview", href: "/finance", label: "Overview" },
  { id: "transactions", href: "/finance/transactions", label: "Transactions" },
  { id: "pnl", href: "/finance/pnl", label: "P&L" },
  { id: "categories", href: "/finance/categories", label: "Categories" },
  { id: "accounts", href: "/finance/accounts", label: "Accounts" },
] as const;

export type FinanceTabId = (typeof FINANCE_TABS)[number]["id"];

export function financeTabFromPathname(pathname: string): FinanceTabId {
  if (pathname.startsWith("/finance/transactions")) return "transactions";
  if (pathname.startsWith("/finance/pnl")) return "pnl";
  if (pathname.startsWith("/finance/categories")) return "categories";
  if (pathname.startsWith("/finance/accounts")) return "accounts";
  return "overview";
}
