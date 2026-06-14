"use client";

import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { useAuth } from "@/lib/auth/auth-context";
import { useAppData } from "@/lib/storage";
import { formatIsoTimestamp } from "@/lib/timezone";

export function CloudStorageCard() {
  const { user, logout } = useAuth();
  const { syncStatus, syncNow } = useAppData();

  const statusLabel =
    syncStatus.state === "syncing"
      ? "Saving…"
      : syncStatus.state === "synced"
        ? syncStatus.lastSyncedAt
          ? `Synced ${formatIsoTimestamp(syncStatus.lastSyncedAt)}`
          : "Synced"
        : syncStatus.state === "error"
          ? syncStatus.message ?? "Sync error"
          : "Signed in — data syncs automatically";

  return (
    <>
      <SectionCard title="Account" inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-ios-label">{user?.displayName}</p>
            <p className="text-sm text-ios-secondary">{user?.email}</p>
          </div>
          <GlassButton variant="secondary" onClick={() => void logout()}>
            Sign out
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="Cloud sync" inset={false}>
        <div className="ios-card p-4">
          <p className="mb-3 text-sm text-ios-secondary">
            Your data is saved to the server while you are signed in. A local copy is kept on this device as backup.
          </p>
          <p className="text-sm text-ios-label">{statusLabel}</p>
          <GlassButton variant="primary" className="mt-3" onClick={() => void syncNow()}>
            Sync now
          </GlassButton>
        </div>
      </SectionCard>
    </>
  );
}
