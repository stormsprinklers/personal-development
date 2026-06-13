"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  APP_SECTIONS,
  TAB_SWIPE_ENTER_KEY,
  adjacentAppSectionHref,
  appSectionIndex,
} from "@/lib/navigation";
import { prefetchAdjacentTabRoutes } from "@/lib/tab-prefetch";

type Props = {
  children: ReactNode;
};

const SWIPE_COMMIT_PX = 56;
const SWIPE_DIRECTION_LOCK_PX = 10;
const SWIPE_SNAP_MS = 180;

function shouldIgnoreSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, button, a, label, [data-no-tab-swipe], .ios-scroll-tabs, [role='dialog'], table",
    ),
  );
}

export function SwipeTabContent({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const sectionIndex = appSectionIndex(pathname);
  const swipeEnabled = sectionIndex !== null;

  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
    locked: null as "horizontal" | "vertical" | null,
  });
  const dragXRef = useRef(0);
  const animatingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const swipeEnabledRef = useRef(swipeEnabled);
  const sectionIndexRef = useRef(sectionIndex);

  dragXRef.current = dragX;
  animatingRef.current = animating;
  pathnameRef.current = pathname;
  swipeEnabledRef.current = swipeEnabled;
  sectionIndexRef.current = sectionIndex;

  useEffect(() => {
    sessionStorage.removeItem(TAB_SWIPE_ENTER_KEY);
    setDragX(0);
    setAnimating(false);
  }, [pathname]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

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
      window.setTimeout(() => setAnimating(false), SWIPE_SNAP_MS);
    }

    function commitSwipe() {
      const width = widthRef.current || node!.offsetWidth || window.innerWidth;
      const currentDrag = dragXRef.current;
      const commit = Math.abs(currentDrag) >= SWIPE_COMMIT_PX || Math.abs(currentDrag) >= width * 0.16;
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

      sessionStorage.setItem(TAB_SWIPE_ENTER_KEY, direction);
      setDragX(0);
      setAnimating(false);
      router.push(href);
    }

    function onTouchStart(event: TouchEvent) {
      if (!swipeEnabledRef.current || animatingRef.current) return;
      if (shouldIgnoreSwipe(event.target)) return;
      if (event.touches.length !== 1) return;

      widthRef.current = node!.offsetWidth || window.innerWidth;
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
        state.locked = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      }

      if (state.locked !== "horizontal") return;

      event.preventDefault();
      setDragX(rubberBand(deltaX));
    }

    function onTouchEnd() {
      const state = touchRef.current;
      if (!state.active) return;
      state.active = false;
      state.locked = null;

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

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [router]);

  return (
    <div
      ref={containerRef}
      className="swipe-tab-content min-w-0"
      style={{
        transform: dragX !== 0 ? `translate3d(${dragX}px, 0, 0)` : undefined,
        transition: animating ? `transform ${SWIPE_SNAP_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)` : undefined,
      }}
    >
      {children}
    </div>
  );
}
