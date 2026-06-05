"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, WorkoutSession } from "@/lib/models";
import {
  LOCAL_STORAGE_KEY,
  type StorageMode,
  type SyncStatus,
  fetchCloudAppData,
  getClientSyncKey,
  getStorageMode,
  saveCloudAppData,
  setClientSyncKey,
  setStorageMode,
} from "@/lib/cloud-sync";
import { createDefaultAppData, normalizeAppData, parseStoredJson } from "@/lib/normalize-app-data";
import { todayKey } from "@/lib/timezone";

export { todayKey };

const CLOUD_SAVE_DEBOUNCE_MS = 900;

type AppDataContextValue = {
  data: AppData;
  ready: boolean;
  storageMode: StorageMode;
  syncStatus: SyncStatus;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addWorkoutSession: (session: WorkoutSession) => void;
  upsertWorkoutForDate: (date: string, updater: (existing: WorkoutSession | undefined) => WorkoutSession) => void;
  enableCloudStorage: (syncKey: string, options?: { uploadCurrent?: boolean }) => Promise<void>;
  disableCloudStorage: () => void;
  syncNow: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultAppData);
  const [ready, setReady] = useState(false);
  const [storageMode, setStorageModeState] = useState<StorageMode>("local");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "idle" });
  const dataRef = useRef(data);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextCloudSaveRef = useRef(false);

  dataRef.current = data;

  const persistLocal = useCallback((next: AppData) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const pushToCloud = useCallback(async (payload: AppData) => {
    const syncKey = getClientSyncKey();
    if (!syncKey) throw new Error("Sync key is missing.");
    setSyncStatus({ state: "syncing" });
    const updatedAt = await saveCloudAppData(syncKey, payload);
    persistLocal(payload);
    setSyncStatus({ state: "synced", lastSyncedAt: updatedAt });
  }, [persistLocal]);

  const syncNow = useCallback(async () => {
    if (getStorageMode() !== "cloud") return;
    await pushToCloud(dataRef.current);
  }, [pushToCloud]);

  const enableCloudStorage = useCallback(
    async (syncKey: string, options?: { uploadCurrent?: boolean }) => {
      setClientSyncKey(syncKey);
      setStorageMode("cloud");
      setStorageModeState("cloud");
      skipNextCloudSaveRef.current = true;

      if (options?.uploadCurrent) {
        await pushToCloud(dataRef.current);
        setReady(true);
        return;
      }

      const { data: remote } = await fetchCloudAppData(syncKey);
      if (remote) {
        const normalized = normalizeAppData(remote);
        setData(normalized);
        persistLocal(normalized);
      } else {
        await pushToCloud(dataRef.current);
      }
      setReady(true);
    },
    [persistLocal, pushToCloud],
  );

  const disableCloudStorage = useCallback(() => {
    setStorageMode("local");
    setStorageModeState("local");
    setSyncStatus({ state: "idle" });
    persistLocal(dataRef.current);
  }, [persistLocal]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mode = getStorageMode();
      const syncKey = getClientSyncKey();
      setStorageModeState(mode);

      if (mode === "cloud" && syncKey) {
        try {
          const { data: remote, updatedAt } = await fetchCloudAppData(syncKey);
          if (cancelled) return;
          skipNextCloudSaveRef.current = true;
          if (remote) {
            const normalized = normalizeAppData(remote);
            setData(normalized);
            persistLocal(normalized);
            setSyncStatus({ state: "synced", lastSyncedAt: updatedAt ?? undefined });
          } else {
            const local = parseStoredJson(window.localStorage.getItem(LOCAL_STORAGE_KEY));
            setData(local);
            await saveCloudAppData(syncKey, local);
            persistLocal(local);
            setSyncStatus({ state: "synced", lastSyncedAt: new Date().toISOString() });
          }
        } catch (e) {
          if (cancelled) return;
          const local = parseStoredJson(window.localStorage.getItem(LOCAL_STORAGE_KEY));
          setData(local);
          setSyncStatus({
            state: "error",
            message: e instanceof Error ? e.message : "Could not reach cloud storage.",
          });
        }
      } else {
        setData(parseStoredJson(window.localStorage.getItem(LOCAL_STORAGE_KEY)));
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [persistLocal]);

  useEffect(() => {
    if (!ready) return;

    if (storageMode === "local") {
      persistLocal(data);
      return;
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void pushToCloud(data).catch((e) => {
        setSyncStatus({
          state: "error",
          message: e instanceof Error ? e.message : "Cloud save failed.",
        });
      });
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, ready, storageMode, persistLocal, pushToCloud]);

  const api = useMemo<AppDataContextValue>(
    () => ({
      data,
      ready,
      storageMode,
      syncStatus,
      setData,
      enableCloudStorage,
      disableCloudStorage,
      syncNow,
      addWorkoutSession(session) {
        setData((prev) => ({
          ...prev,
          workoutSessions: [session, ...prev.workoutSessions].sort((a, b) => (a.date < b.date ? 1 : -1)),
        }));
      },
      upsertWorkoutForDate(date, updater) {
        setData((prev) => {
          const existing = prev.workoutSessions.find((s) => s.date === date);
          const next = updater(existing);
          const rest = prev.workoutSessions.filter((s) => s.date !== date);
          return { ...prev, workoutSessions: [next, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1)) };
        });
      },
    }),
    [data, ready, storageMode, syncStatus, enableCloudStorage, disableCloudStorage, syncNow],
  );

  return <AppDataContext.Provider value={api}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
