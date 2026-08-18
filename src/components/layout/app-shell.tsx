"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollTabBar } from "@/components/ui/scroll-tab-bar";
import { TabTransitionSurface } from "@/components/layout/tab-transition";
import { APP_SECTIONS } from "@/lib/navigation";

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  /** Renders above the section nav tabs (e.g. dashboard day picker). */
  header?: ReactNode;
  /** Optional right-side controls in the top bar (overrides workout defaults when set). */
  actions?: ReactNode;
};

export function AppShell({ title, description: _description, children, header, actions }: AppShellProps) {
  void _description;
  const pathname = usePathname();
  const onRoutineEditPage = pathname.startsWith("/health/workouts/routines/");

  const topRight =
    actions ??
    (onRoutineEditPage ? (
      <Link
        href="/health/workouts"
        className="glass-button inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-ios-label"
      >
        Workouts
      </Link>
    ) : null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ios-bg text-ios-label">
      <div
        className="fixed inset-x-0 top-0 z-40 bg-transparent"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto w-full max-w-xl min-w-0 px-4 pb-1 pt-2">
          <ScrollTabBar sections={APP_SECTIONS} activePath={pathname} />
        </div>
      </div>

      <TabTransitionSurface className="min-h-0 flex-1">
        <div
          data-app-scroll
          className="safe-bottom mx-auto flex h-full w-full max-w-xl min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-4 pt-[calc(3.75rem+env(safe-area-inset-top,0px))]"
        >
          {title ? (
            <header className="mb-3 min-w-0">
              <h1 className="ios-large-title">{title}</h1>
            </header>
          ) : null}
          {header ? <div className="mb-3 min-w-0">{header}</div> : null}
          {topRight ? <div className="mb-2 flex justify-end gap-2">{topRight}</div> : null}
          <main className="grid min-w-0 gap-5">{children}</main>
        </div>
      </TabTransitionSurface>
    </div>
  );
}
