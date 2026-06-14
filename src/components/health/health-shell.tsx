"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsSubTabBar } from "@/components/ui/settings-sub-tab-bar";
import { HEALTH_TABS, healthTabFromPathname } from "@/lib/health-tabs";

type Props = {
  title: string;
  description: string;
  header?: ReactNode;
  children: ReactNode;
};

export function HealthShell({ title, description, header, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = healthTabFromPathname(pathname);

  return (
    <AppShell
      title={title}
      description={description}
      header={
        <>
          <SettingsSubTabBar
            tabs={HEALTH_TABS}
            activeId={activeTab}
            onSelect={(id) => {
              const tab = HEALTH_TABS.find((t) => t.id === id);
              if (tab) router.push(tab.href);
            }}
          />
          {header}
        </>
      }
    >
      {children}
    </AppShell>
  );
}
