import type { AppData } from "@/lib/models";

export type SyncStatus = {
  state: "idle" | "syncing" | "synced" | "error";
  message?: string;
  lastSyncedAt?: string;
};

/** Legacy global cache key (pre multi-user). */
export const LOCAL_STORAGE_KEY = "self-improvement-app-data-v1";
export const LEGACY_SYNC_KEY_STORAGE = "pd-cloud-sync-key";

export function localStorageKeyForUser(userId: string): string {
  return `pd-app-data-${userId}`;
}

export async function fetchUserAppData(): Promise<{ data: AppData | null; updatedAt: string | null }> {
  const response = await fetch("/api/data", { cache: "no-store" });
  const payload = (await response.json()) as { data?: AppData | null; updatedAt?: string | null; error?: string };
  if (response.status === 401) {
    return { data: null, updatedAt: null };
  }
  if (!response.ok) throw new Error(payload.error ?? "Could not load your data.");
  return { data: payload.data ?? null, updatedAt: payload.updatedAt ?? null };
}

export async function saveUserAppData(data: AppData): Promise<string> {
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  const payload = (await response.json()) as { updatedAt?: string; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not save your data.");
  return payload.updatedAt ?? new Date().toISOString();
}
