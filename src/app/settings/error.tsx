"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassButton } from "@/components/ui/glass-button";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Settings page error:", error);
  }, [error]);

  return (
    <AppShell title="Settings" description="">
      <div className="ios-card grid gap-3 p-4">
        <p className="text-sm font-medium text-ios-label">Settings could not load</p>
        <p className="text-sm text-ios-secondary">{error.message || "An unexpected error occurred."}</p>
        <div className="flex flex-wrap gap-2">
          <GlassButton variant="primary" onClick={() => reset()}>
            Try again
          </GlassButton>
          <GlassButton variant="secondary" onClick={() => window.location.assign("/")}>
            Go home
          </GlassButton>
        </div>
      </div>
    </AppShell>
  );
}
