"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FINANCE_TABS, financeTabFromPathname } from "@/lib/finance-tabs";

type Props = {
  title?: string;
  description?: string;
  header?: ReactNode;
  children: ReactNode;
};

export function FinanceShell({
  title = "Finance",
  description = "Track spending, categorize transactions, and review cash flow.",
  header,
  children,
}: Props) {
  const pathname = usePathname();
  const active = financeTabFromPathname(pathname);

  return (
    <AppShell title={title} description={description} header={header}>
      <nav aria-label="Finance sections" className="mb-4 min-w-0">
        <div className="ios-scroll-tabs overflow-x-auto pb-1">
          <div className="flex w-max min-w-full gap-2">
            {FINANCE_TABS.map((tab) => {
              const isActive = tab.id === active;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`glass-button inline-flex snap-start items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                    isActive ? "glass-button-tint text-white" : "text-ios-label"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      {children}
    </AppShell>
  );
}
