"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, WorkoutSession } from "@/lib/models";
import { readLocalAppData, useAuth, writeLocalAppData } from "@/lib/auth/auth-context";
import { fetchUserAppData, saveUserAppData, type SyncStatus } from "@/lib/cloud-sync";
import { createDefaultAppData, normalizeAppData, parseStoredJson } from "@/lib/normalize-app-data";
import { todayKey } from "@/lib/timezone";

export { todayKey };

const CLOUD_SAVE_DEBOUNCE_MS = 900;

type AppDataContextValue = {
  data: AppData;
  ready: boolean;
  syncStatus: SyncStatus;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addWorkoutSession: (session: WorkoutSession) => void;
  upsertWorkoutForDate: (date: string, updater: (existing: WorkoutSession | undefined) => WorkoutSession) => void;
  syncNow: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [data, setData] = useState<AppData>(createDefaultAppData);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "idle" });
  const dataRef = useRef(data);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextCloudSaveRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  dataRef.current = data;
  userIdRef.current = user?.id ?? null;

  const persistLocal = useCallback((next: AppData, userId: string | null) => {
    writeLocalAppData(userId, JSON.stringify(next));
  }, []);

  const pushToCloud = useCallback(
    async (payload: AppData) => {
      if (!userIdRef.current) return;
      setSyncStatus({ state: "syncing" });
      const updatedAt = await saveUserAppData(payload);
      persistLocal(payload, userIdRef.current);
      setSyncStatus({ state: "synced", lastSyncedAt: updatedAt });
    },
    [persistLocal],
  );

  const syncNow = useCallback(async () => {
    if (!userIdRef.current) return;
    await pushToCloud(dataRef.current);
  }, [pushToCloud]);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    if (!user) {
      setData(createDefaultAppData());
      setReady(false);
      setSyncStatus({ state: "idle" });
      return;
    }

    setReady(false);

    (async () => {
      try {
        const { data: remote, updatedAt } = await fetchUserAppData();
        if (cancelled) return;
        skipNextCloudSaveRef.current = true;

        if (remote) {
          const normalized = normalizeAppData(remote);
          setData(normalized);
          persistLocal(normalized, user.id);
          setSyncStatus({ state: "synced", lastSyncedAt: updatedAt ?? undefined });
        } else {
          const local = parseStoredJson(readLocalAppData(user.id));
          setData(local);
          persistLocal(local, user.id);
          await saveUserAppData(local);
          setSyncStatus({ state: "synced", lastSyncedAt: new Date().toISOString() });
        }
      } catch (e) {
        if (cancelled) return;
        const local = parseStoredJson(readLocalAppData(user.id));
        setData(local);
        setSyncStatus({
          state: "error",
          message: e instanceof Error ? e.message : "Could not reach the server.",
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user, persistLocal]);

  useEffect(() => {
    if (!ready || !user) return;

    persistLocal(data, user.id);

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void pushToCloud(data).catch((e) => {
        setSyncStatus({
          state: "error",
          message: e instanceof Error ? e.message : "Save failed.",
        });
      });
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, ready, user, persistLocal, pushToCloud]);

  const api = useMemo<AppDataContextValue>(
    () => ({
      data,
      ready,
      syncStatus,
      setData,
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
    [data, ready, syncStatus, syncNow],
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
