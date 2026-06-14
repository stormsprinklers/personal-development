"use client";

import { useEffect, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { describeInviteSetup } from "@/lib/accountability/link-copy";
import type { InvitePreview } from "@/lib/accountability/invite";
import { useAuth } from "@/lib/auth/auth-context";

type Mode = "login" | "register";

function readInviteIdFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("invite")?.trim() || null;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const id = readInviteIdFromUrl();
    setInviteId(id);
    if (!id) {
      setInvitePreview(null);
      return;
    }

    let cancelled = false;
    setInviteLoading(true);
    void fetch(`/api/accountability/invite/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as InvitePreview;
        if (cancelled) return;
        setInvitePreview(payload);
        if (payload.valid) {
          setMode("register");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInvitePreview({ valid: false, error: "Could not load invite." });
        }
      })
      .finally(() => {
        if (!cancelled) setInviteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName, invitePreview?.valid ? inviteId ?? undefined : undefined);
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
    const inviteLines =
      invitePreview?.valid && invitePreview.inviterName
        ? describeInviteSetup(
            invitePreview.inviterName,
            invitePreview.fromShares === true,
            invitePreview.toShares === true,
          )
        : [];

    return (
      <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center bg-ios-bg px-4 py-8">
        <div className="ios-card w-full max-w-sm p-6">
          <h1 className="ios-headline text-center">Personal Development Hub</h1>
          <p className="mt-2 text-center text-sm text-ios-secondary">
            {invitePreview?.valid
              ? `${invitePreview.inviterName} invited you to join as an accountability partner.`
              : mode === "login"
                ? "Sign in to your account."
                : "Create an account to get started."}
          </p>
          {inviteLoading ? <p className="mt-3 text-center text-sm text-ios-secondary">Loading invite…</p> : null}
          {invitePreview && !invitePreview.valid && inviteId ? (
            <p className="mt-3 rounded-xl bg-copper/10 px-3 py-2 text-center text-sm text-copper">
              {invitePreview.error ?? "This invite is not valid."}
            </p>
          ) : null}
          {inviteLines.length ? (
            <ul className="mt-3 list-inside list-disc text-sm text-ios-secondary">
              {inviteLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
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
            <GlassButton type="submit" variant="primary" className="w-full" disabled={busy || inviteLoading}>
              {mode === "login" ? "Sign in" : invitePreview?.valid ? "Create account & connect" : "Create account"}
            </GlassButton>
          </form>
          {!invitePreview?.valid ? (
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
          ) : null}
          {mode === "register" && !invitePreview?.valid ? (
            <p className="mt-3 text-xs text-ios-secondary">
              Your existing data on this device will be imported when you register.
            </p>
          ) : null}
          {invitePreview?.valid ? (
            <p className="mt-3 text-xs text-ios-secondary">
              Creating an account through this link automatically connects you with {invitePreview.inviterName} using
              the permissions above.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (inviteId) {
    return (
      <>
        <div className="safe-top px-4 pt-3">
          <p className="ios-card-muted rounded-xl px-3 py-2 text-center text-sm text-ios-secondary">
            Accountability invite links are for new accounts. You are already signed in.
          </p>
        </div>
        {children}
      </>
    );
  }

  return children;
}
