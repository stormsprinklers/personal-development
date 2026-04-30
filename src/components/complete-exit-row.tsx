"use client";

import type { ReactNode } from "react";

/** Match CSS duration + setTimeout in complete handlers (ms). */
export const COMPLETE_EXIT_MS = 400;

type Props = {
  exiting: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Collapses row height (grid 1fr → 0fr) while fading content so items below ease up.
 */
export function CompleteExitRow({ exiting, children, className = "" }: Props) {
  return (
    <div
      className={`grid overflow-hidden transition-[grid-template-rows] ease-in-out ${exiting ? "grid-rows-[0fr] duration-[400ms]" : "grid-rows-[1fr] duration-200"} ${className}`}
    >
      <div className="min-h-0">
        <div
          className={`transition-[opacity,transform] duration-300 ease-out ${exiting ? "pointer-events-none -translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
