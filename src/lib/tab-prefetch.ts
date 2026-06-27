import { APP_SECTIONS } from "@/lib/navigation";

type TabRouter = {
  prefetch: (href: string) => void;
};

/** Warm Next.js route cache for every main tab. */
export function prefetchAppTabRoutes(router: TabRouter) {
  for (const section of APP_SECTIONS) {
    router.prefetch(section.href);
  }
}

/** Preload client JS for tab pages so navigation reuses cached chunks. */
export function preloadAppTabChunks() {
  void import("@/app/page");
  void import("@/app/health/workouts/page");
  void import("@/app/goals/page");
  void import("@/app/journal/page");
  void import("@/app/habits/page");
  void import("@/app/todos/page");
  void import("@/app/settings/page");
  // Food tab deferred — pulls in barcode scanner / zxing when opened.
}

export function prefetchAdjacentTabRoutes(
  router: TabRouter,
  prevHref: string | null,
  nextHref: string | null,
) {
  if (prevHref) router.prefetch(prevHref);
  if (nextHref) router.prefetch(nextHref);
}
