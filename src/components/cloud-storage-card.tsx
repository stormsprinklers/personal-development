"use client";

import { useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { getClientSyncKey, getStorageMode } from "@/lib/cloud-sync";
import { useAppData } from "@/lib/storage";

export function CloudStorageCard() {
  const { storageMode, syncStatus, enableCloudStorage, disableCloudStorage, syncNow } = useAppData();
  const [syncKeyDraft, setSyncKeyDraft] = useState(() => getClientSyncKey());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleEnable(uploadCurrent: boolean) {
    const key = syncKeyDraft.trim();
    if (!key) {
      setActionError("Enter your sync key first.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await enableCloudStorage(key, { uploadCurrent });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not enable cloud storage.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    setActionError(null);
    try {
      await syncNow();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    syncStatus.state === "syncing"
      ? "Saving to cloud..."
      : syncStatus.state === "synced"
        ? syncStatus.lastSyncedAt
          ? `Synced ${new Date(syncStatus.lastSyncedAt).toLocaleString()}`
          : "Synced"
        : syncStatus.state === "error"
          ? syncStatus.message ?? "Sync error"
          : storageMode === "cloud"
            ? "Cloud storage enabled"
            : "Saving on this device only";

  return (
    <SectionCard title="Cloud storage">
      <p className="mb-3 text-sm text-ios-secondary">
        Store your full app data in the cloud database instead of only this browser. Use the same sync key on every
        device. Your server needs <code className="text-xs">DATABASE_URL</code> and <code className="text-xs">APP_SYNC_KEY</code>{" "}
        configured.
      </p>

      {storageMode === "local" ? (
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Sync key
            <input
              type="password"
              value={syncKeyDraft}
              onChange={(e) => setSyncKeyDraft(e.target.value)}
              placeholder="Same value as APP_SYNC_KEY on server"
              className="ios-field px-3 py-2.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <GlassButton variant="primary" disabled={busy} onClick={() => void handleEnable(true)}>
              Enable cloud and upload
            </GlassButton>
            <GlassButton variant="secondary" disabled={busy} onClick={() => void handleEnable(false)}>
              Enable and load from cloud
            </GlassButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-ios-label">{statusLabel}</p>
          <div className="flex flex-wrap gap-2">
            <GlassButton variant="primary" disabled={busy} onClick={() => void handleSyncNow()}>
              Sync now
            </GlassButton>
            <GlassButton
              variant="secondary"
              disabled={busy}
              onClick={() => {
                disableCloudStorage();
                setActionError(null);
              }}
            >
              Use local storage only
            </GlassButton>
          </div>
        </div>
      )}

      {actionError ? <p className="mt-2 text-sm text-copper">{actionError}</p> : null}
      {getStorageMode() === "cloud" ? (
        <p className="mt-2 text-xs text-ios-secondary">
          Changes auto-save to the cloud after you edit. A local copy is kept as a backup cache.
        </p>
      ) : null}
    </SectionCard>
  );
}
