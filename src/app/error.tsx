"use client";

import { useEffect } from "react";
import { GlassButton } from "@/components/ui/glass-button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center bg-ios-bg px-4">
      <div className="ios-card w-full max-w-sm grid gap-3 p-6">
        <h1 className="ios-headline text-center">Something went wrong</h1>
        <p className="text-center text-sm text-ios-secondary">{error.message || "This page could not load."}</p>
        <GlassButton variant="primary" className="w-full" onClick={() => reset()}>
          Reload
        </GlassButton>
      </div>
    </div>
  );
}
