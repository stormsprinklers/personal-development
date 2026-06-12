"use client";

import { useEffect, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { isAuthenticated, rememberAuthentication, verifyPassword } from "@/lib/app-auth";

type Props = {
  children: React.ReactNode;
};

export function AuthGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setReady(true);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!verifyPassword(password)) {
      setError("Incorrect password.");
      return;
    }
    rememberAuthentication();
    setAuthed(true);
    setPassword("");
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ios-bg px-4">
        <p className="text-sm text-ios-secondary">Loading…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center bg-ios-bg px-4 py-8">
        <div className="ios-card w-full max-w-sm p-6">
          <h1 className="ios-headline text-center">Personal Development Hub</h1>
          <p className="mt-2 text-center text-sm text-ios-secondary">Enter your password to continue.</p>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <label className="grid gap-1.5 text-xs font-medium text-ios-secondary">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                className="ios-field px-4 py-3 text-sm"
              />
            </label>
            {error ? <p className="text-sm text-copper">{error}</p> : null}
            <GlassButton type="submit" variant="primary" className="w-full" disabled={!password}>
              Sign in
            </GlassButton>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
