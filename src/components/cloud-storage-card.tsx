"use client";

import { useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
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
      <p className="mb-3 text-sm text-slate">
        Store your full app data in the cloud database instead of only this browser. Use the same sync key on every
        device. Your server needs <code className="text-xs">DATABASE_URL</code> and <code className="text-xs">APP_SYNC_KEY</code>{" "}
        configured.
      </p>

      {storageMode === "local" ? (
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs font-medium text-slate/95">
            Sync key
            <input
              type="password"
              value={syncKeyDraft}
              onChange={(e) => setSyncKeyDraft(e.target.value)}
              placeholder="Same value as APP_SYNC_KEY on server"
              className="rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleEnable(true)}
              className="rounded-lg bg-steel px-3 py-2 text-sm font-medium text-white hover:bg-steel/90 disabled:opacity-40"
            >
              Enable cloud and upload this device
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleEnable(false)}
              className="rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-slate hover:bg-steel/10 disabled:opacity-40"
            >
              Enable and load from cloud
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-charcoal">{statusLabel}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSyncNow()}
              className="rounded-lg bg-steel px-3 py-2 text-sm font-medium text-white hover:bg-steel/90 disabled:opacity-40"
            >
              Sync now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                disableCloudStorage();
                setActionError(null);
              }}
              className="rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-slate hover:bg-steel/10 disabled:opacity-40"
            >
              Use local storage only
            </button>
          </div>
        </div>
      )}

      {actionError ? <p className="mt-2 text-sm text-copper">{actionError}</p> : null}
      {getStorageMode() === "cloud" ? (
        <p className="mt-2 text-xs text-slate/90">
          Changes auto-save to the cloud after you edit. A local copy is kept as a backup cache.
        </p>
      ) : null}
    </SectionCard>
  );
}
