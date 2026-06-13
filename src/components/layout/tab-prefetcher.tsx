"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { prefetchAppTabRoutes, preloadAppTabChunks } from "@/lib/tab-prefetch";

/** Prefetch all main tab routes and JS chunks once the app shell is active. */
export function TabPrefetcher() {
  const router = useRouter();

  useEffect(() => {
    prefetchAppTabRoutes(router);
    preloadAppTabChunks();

    const retry = window.setTimeout(() => {
      prefetchAppTabRoutes(router);
    }, 1500);

    return () => window.clearTimeout(retry);
  }, [router]);

  return null;
}
