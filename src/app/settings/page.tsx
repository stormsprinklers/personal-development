"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CloudStorageCard } from "@/components/cloud-storage-card";
import { AccountabilitySettingsPanel } from "@/components/settings/accountability-settings-panel";
import { NotificationsSettingsPanel } from "@/components/settings/notifications-settings-panel";
import { SettingsSubTabBar } from "@/components/ui/settings-sub-tab-bar";
import { SETTINGS_TABS, parseSettingsTab, type SettingsTabId } from "@/lib/settings-tabs";
import { useAppData } from "@/lib/storage";

function readTabFromLocation(): SettingsTabId {
  if (typeof window === "undefined") return "cloud";
  return parseSettingsTab(new URLSearchParams(window.location.search).get("tab"));
}

function settingsPathForTab(tab: SettingsTabId): string {
  return tab === "cloud" ? "/settings" : `/settings?tab=${tab}`;
}

function SettingsShell({
  activeTab,
  onSelectTab,
  children,
}: {
  activeTab: SettingsTabId;
  onSelectTab: (tabId: string) => void;
  children: React.ReactNode;
}) {
  return (
    <AppShell
      title="Settings"
      description="Account, cloud sync, accountability, and notifications."
      header={<SettingsSubTabBar tabs={SETTINGS_TABS} activeId={activeTab} onSelect={onSelectTab} />}
    >
      {children}
    </AppShell>
  );
}

export default function SettingsPage() {
  const { ready } = useAppData();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("cloud");

  useEffect(() => {
    setActiveTab(readTabFromLocation());

    const onPopState = () => setActiveTab(readTabFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = useCallback((tabId: string) => {
    const next = parseSettingsTab(tabId);
    setActiveTab(next);
    const path = settingsPathForTab(next);
    window.history.replaceState(null, "", path);
  }, []);

  if (!ready) {
    return (
      <SettingsShell activeTab={activeTab} onSelectTab={selectTab}>
        <p className="text-sm text-ios-secondary">Loading settings…</p>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell activeTab={activeTab} onSelectTab={selectTab}>
      {activeTab === "cloud" ? <CloudStorageCard /> : null}
      {activeTab === "accountability" ? <AccountabilitySettingsPanel /> : null}
      {activeTab === "notifications" ? <NotificationsSettingsPanel /> : null}
    </SettingsShell>
  );
}
