"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  APP_SECTIONS,
  TAB_SWIPE_ENTER_KEY,
  adjacentAppSectionHref,
  appSectionIndex,
  tabTransitionDirection,
} from "@/lib/navigation";
import { prefetchAdjacentTabRoutes } from "@/lib/tab-prefetch";

const SWIPE_COMMIT_PX = 64;
const SWIPE_DIRECTION_LOCK_PX = 10;
const TAB_TRANSITION_MS = 260;
const TAB_PUSH_DELAY_MS = Math.round(TAB_TRANSITION_MS * 0.5);
const TAB_TRANSITION_EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";

type TabTransitionContextValue = {
  dragX: number;
  animating: boolean;
  navigateToTab: (href: string) => void;
};

const TabTransitionContext = createContext<TabTransitionContextValue | null>(null);

const APP_SCROLL_SELECTOR = "[data-app-scroll]";

function appScrollContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(APP_SCROLL_SELECTOR);
}

function isPageScrolled(): boolean {
  const scrollEl = appScrollContainer();
  return scrollEl ? scrollEl.scrollTop > 0 : false;
}

function shouldIgnoreSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [data-no-tab-swipe], [role='dialog'], table, .ios-scroll-tabs",
    ),
  );
}

function viewportWidth() {
  if (typeof window === "undefined") return 390;
  return window.innerWidth;
}

export function TabTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sectionIndex = appSectionIndex(pathname);
  const swipeEnabled = sectionIndex !== null;

  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const dragXRef = useRef(0);
  const animatingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const swipeEnabledRef = useRef(swipeEnabled);
  const sectionIndexRef = useRef(sectionIndex);
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
    locked: null as "horizontal" | "vertical" | null,
  });

  dragXRef.current = dragX;
  animatingRef.current = animating;
  pathnameRef.current = pathname;
  swipeEnabledRef.current = swipeEnabled;
  sectionIndexRef.current = sectionIndex;

  const transitionToTab = useCallback(
    (href: string, direction: "next" | "prev") => {
      if (animatingRef.current) return;

      const width = viewportWidth();
      const exitX = direction === "next" ? -width : width;

      sessionStorage.setItem(TAB_SWIPE_ENTER_KEY, direction);
      setAnimating(true);
      setDragX(exitX);

      router.prefetch(href);
      window.setTimeout(() => {
        router.push(href);
      }, TAB_PUSH_DELAY_MS);
    },
    [router],
  );

  const navigateToTab = useCallback(
    (href: string) => {
      const direction = tabTransitionDirection(pathnameRef.current, href);
      if (!direction) {
        router.push(href);
        return;
      }
      transitionToTab(href, direction);
    },
    [router, transitionToTab],
  );

  useEffect(() => {
    const direction = sessionStorage.getItem(TAB_SWIPE_ENTER_KEY) as "next" | "prev" | null;
    if (!direction) {
      setDragX(0);
      setAnimating(false);
      return;
    }
    sessionStorage.removeItem(TAB_SWIPE_ENTER_KEY);

    const width = viewportWidth();
    const enterX = direction === "next" ? width : -width;
    setAnimating(false);
    setDragX(enterX);

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
        setDragX(0);
      });
    });
    const timer = window.setTimeout(() => setAnimating(false), TAB_TRANSITION_MS + 32);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!swipeEnabled) return;

    function rubberBand(deltaX: number) {
      const index = sectionIndexRef.current;
      if (index === null) return deltaX * 0.2;
      const hasPrev = index > 0;
      const hasNext = index < APP_SECTIONS.length - 1;
      if (deltaX > 0 && !hasPrev) return deltaX * 0.22;
      if (deltaX < 0 && !hasNext) return deltaX * 0.22;
      return deltaX;
    }

    function resetDrag() {
      setAnimating(true);
      setDragX(0);
      window.setTimeout(() => setAnimating(false), TAB_TRANSITION_MS);
    }

    function commitSwipe() {
      const width = viewportWidth();
      const currentDrag = dragXRef.current;
      const commit = Math.abs(currentDrag) >= SWIPE_COMMIT_PX || Math.abs(currentDrag) >= width * 0.18;
      const direction = currentDrag < 0 ? "next" : "prev";

      if (!commit) {
        resetDrag();
        return;
      }

      const href = adjacentAppSectionHref(pathnameRef.current, direction);
      if (!href) {
        resetDrag();
        return;
      }

      transitionToTab(href, direction);
    }

    function onTouchStart(event: TouchEvent) {
      if (!swipeEnabledRef.current || animatingRef.current) return;
      if (shouldIgnoreSwipe(event.target)) return;
      if (isPageScrolled()) return;
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        locked: null,
      };

      prefetchAdjacentTabRoutes(
        router,
        adjacentAppSectionHref(pathnameRef.current, "prev"),
        adjacentAppSectionHref(pathnameRef.current, "next"),
      );
    }

    function onTouchMove(event: TouchEvent) {
      const state = touchRef.current;
      if (!state.active || !swipeEnabledRef.current || animatingRef.current) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      if (!state.locked) {
        if (Math.abs(deltaX) < SWIPE_DIRECTION_LOCK_PX && Math.abs(deltaY) < SWIPE_DIRECTION_LOCK_PX) return;
        state.locked = Math.abs(deltaX) > Math.abs(deltaY) * 1.2 ? "horizontal" : "vertical";
      }

      if (state.locked !== "horizontal") return;

      if (isPageScrolled()) {
        state.locked = "vertical";
        return;
      }

      event.preventDefault();
      setAnimating(false);
      setDragX(rubberBand(deltaX));
    }

    function onTouchEnd() {
      const state = touchRef.current;
      if (!state.active) return;
      const wasVertical = state.locked === "vertical";
      state.active = false;
      state.locked = null;

      if (wasVertical) {
        return;
      }

      if (!swipeEnabledRef.current || animatingRef.current) {
        setDragX(0);
        return;
      }

      commitSwipe();
    }

    function onTouchCancel() {
      touchRef.current.active = false;
      touchRef.current.locked = null;
      if (!animatingRef.current) resetDrag();
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [router, swipeEnabled, transitionToTab]);

  const value = useMemo(
    () => ({ dragX, animating, navigateToTab }),
    [dragX, animating, navigateToTab],
  );

  return <TabTransitionContext.Provider value={value}>{children}</TabTransitionContext.Provider>;
}

export function useTabTransition() {
  const ctx = useContext(TabTransitionContext);
  if (!ctx) throw new Error("useTabTransition must be used within TabTransitionProvider");
  return ctx;
}

export function TabTransitionSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { dragX, animating } = useTabTransition();

  return (
    <div
      className={`swipe-tab-content min-w-0 ${className}`.trim()}
      style={{
        transform: dragX !== 0 || animating ? `translate3d(${dragX}px, 0, 0)` : undefined,
        transition: animating ? `transform ${TAB_TRANSITION_MS}ms ${TAB_TRANSITION_EASE}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export { TAB_TRANSITION_MS };
