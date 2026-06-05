import type { AppData } from "@/lib/models";

export type StorageMode = "local" | "cloud";

export const LOCAL_STORAGE_KEY = "self-improvement-app-data-v1";
export const SYNC_KEY_STORAGE = "pd-cloud-sync-key";
export const STORAGE_MODE_KEY = "pd-storage-mode";

export type SyncStatus = {
  state: "idle" | "syncing" | "synced" | "error";
  message?: string;
  lastSyncedAt?: string;
};

export function getStorageMode(): StorageMode {
  if (typeof window === "undefined") return "local";
  return window.localStorage.getItem(STORAGE_MODE_KEY) === "cloud" ? "cloud" : "local";
}

export function setStorageMode(mode: StorageMode) {
  window.localStorage.setItem(STORAGE_MODE_KEY, mode);
}

export function getClientSyncKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SYNC_KEY_STORAGE)?.trim() ?? "";
}

export function setClientSyncKey(key: string) {
  window.localStorage.setItem(SYNC_KEY_STORAGE, key.trim());
}

export function clearClientSyncKey() {
  window.localStorage.removeItem(SYNC_KEY_STORAGE);
}

function syncHeaders(syncKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Sync-Key": syncKey,
  };
}

export async function fetchCloudAppData(syncKey: string): Promise<{ data: AppData | null; updatedAt: string | null }> {
  const response = await fetch("/api/data", { headers: syncHeaders(syncKey), cache: "no-store" });
  const payload = (await response.json()) as { data?: AppData | null; updatedAt?: string | null; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not load cloud data.");
  return { data: payload.data ?? null, updatedAt: payload.updatedAt ?? null };
}

export async function saveCloudAppData(syncKey: string, data: AppData): Promise<string> {
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: syncHeaders(syncKey),
    body: JSON.stringify({ data }),
  });
  const payload = (await response.json()) as { updatedAt?: string; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not save to cloud.");
  return payload.updatedAt ?? new Date().toISOString();
}
