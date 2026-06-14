"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { useAuth } from "@/lib/auth/auth-context";

type Mode = "login" | "register";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ios-bg px-4">
        <p className="text-sm text-ios-secondary">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center bg-ios-bg px-4 py-8">
        <div className="ios-card w-full max-w-sm p-6">
          <h1 className="ios-headline text-center">Personal Development Hub</h1>
          <p className="mt-2 text-center text-sm text-ios-secondary">
            {mode === "login" ? "Sign in to your account." : "Create an account to get started."}
          </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 grid gap-3">
            {mode === "register" ? (
              <label className="grid gap-1.5 text-xs font-medium text-ios-secondary">
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  className="ios-field px-4 py-3 text-sm"
                />
              </label>
            ) : null}
            <label className="grid gap-1.5 text-xs font-medium text-ios-secondary">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="ios-field px-4 py-3 text-sm"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-ios-secondary">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="ios-field px-4 py-3 text-sm"
              />
            </label>
            {error ? <p className="text-sm text-copper">{error}</p> : null}
            <GlassButton type="submit" variant="primary" className="w-full" disabled={busy}>
              {mode === "login" ? "Sign in" : "Create account"}
            </GlassButton>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-ios-secondary underline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
          </button>
          {mode === "register" ? (
            <p className="mt-3 text-xs text-ios-secondary">
              Your existing data on this device will be imported when you register.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return children;
}
