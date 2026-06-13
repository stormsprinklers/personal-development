"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CloudStorageCard } from "@/components/cloud-storage-card";
import { AccountabilitySettingsPanel } from "@/components/settings/accountability-settings-panel";
import { SettingsSubTabBar } from "@/components/ui/settings-sub-tab-bar";
import { SETTINGS_TABS, parseSettingsTab } from "@/lib/settings-tabs";
import { useAppData } from "@/lib/storage";

function SettingsContent() {
  const { ready } = useAppData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseSettingsTab(searchParams.get("tab"));

  const selectTab = useCallback(
    (tabId: string) => {
      const next = parseSettingsTab(tabId);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "cloud") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `/settings?${query}` : "/settings", { scroll: false });
    },
    [router, searchParams],
  );

  if (!ready) return <div className="p-6">Loading settings...</div>;

  return (
    <AppShell
      title="Settings"
      description="Cloud sync, accountability partners, and app preferences."
      header={<SettingsSubTabBar tabs={SETTINGS_TABS} activeId={activeTab} onSelect={selectTab} />}
    >
      {activeTab === "cloud" ? <CloudStorageCard /> : null}
      {activeTab === "accountability" ? <AccountabilitySettingsPanel /> : null}
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
