"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LOCAL_STORAGE_KEY,
  LEGACY_SYNC_KEY_STORAGE,
  localStorageKeyForUser,
} from "@/lib/cloud-sync";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  accountabilityCode: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json()) as { user?: AuthUser | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not verify session.");
      setUser(payload.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setReady(true));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { user?: AuthUser; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Login failed.");
      setUser(payload.user ?? null);
    },
    [],
  );

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    let localPayload: unknown;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) localPayload = JSON.parse(raw);
    } catch {
      localPayload = undefined;
    }
    const legacySyncKey = window.localStorage.getItem(LEGACY_SYNC_KEY_STORAGE)?.trim() || undefined;

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, localPayload, legacySyncKey }),
    });
    const payload = (await response.json()) as { user?: AuthUser; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Registration failed.");
    setUser(payload.user ?? null);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refresh }),
    [user, ready, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Read cached app data for the signed-in user (or legacy global key). */
export function readLocalAppData(userId: string | null): string | null {
  if (typeof window === "undefined") return null;
  if (userId) {
    const keyed = window.localStorage.getItem(localStorageKeyForUser(userId));
    if (keyed) return keyed;
  }
  return window.localStorage.getItem(LOCAL_STORAGE_KEY);
}

export function writeLocalAppData(userId: string | null, json: string) {
  if (typeof window === "undefined") return;
  if (userId) {
    window.localStorage.setItem(localStorageKeyForUser(userId), json);
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, json);
}
