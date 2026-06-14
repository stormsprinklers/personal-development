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

function SettingsIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function AppShell({ title, description: _description, children, header, actions }: AppShellProps) {
  void _description;
  const pathname = usePathname();

  const onRoutineEditPage = pathname.startsWith("/health/workouts/routines/");
  const onHealthFood = pathname === "/health/food";
  const onHealthWorkouts = pathname === "/health/workouts";
  const onHealthSettings = pathname === "/health/settings";
  const onWorkoutSettings = pathname === "/health/workouts/settings";

  const healthTopActions =
    onHealthFood || onHealthWorkouts ? (
      <Link
        href="/health/settings"
        className="glass-button inline-flex h-11 min-w-11 items-center justify-center rounded-full text-ios-label shadow-sm"
        aria-label="Health settings"
        title="Health settings"
      >
        <SettingsIcon />
      </Link>
    ) : onHealthSettings ? (
      <Link
        href="/health/workouts"
        className="glass-button inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-ios-label"
      >
        Health
      </Link>
    ) : onWorkoutSettings || onRoutineEditPage ? (
      <div className="flex shrink-0 items-center gap-2">
        {onRoutineEditPage ? (
          <Link
            href="/health/workouts/settings"
            className="glass-button inline-flex h-11 min-w-11 items-center justify-center rounded-full text-ios-label shadow-sm"
            aria-label="Workout settings"
            title="Workout settings"
          >
            <SettingsIcon />
          </Link>
        ) : null}
        <Link
          href="/health/workouts"
          className="glass-button inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-ios-label"
        >
          Workouts
        </Link>
      </div>
    ) : null;

  const topRight = actions ?? healthTopActions;

  return (
    <div className="min-h-dvh bg-ios-bg text-ios-label">
      <div
        className="fixed inset-x-0 top-0 z-40 bg-transparent"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto w-full max-w-xl min-w-0 px-4 pb-1 pt-2">
          <ScrollTabBar sections={APP_SECTIONS} activePath={pathname} />
        </div>
      </div>

      <TabTransitionSurface>
        <div className="safe-bottom mx-auto flex w-full max-w-xl min-w-0 flex-col overflow-x-hidden px-4 pb-4 pt-[calc(3.75rem+env(safe-area-inset-top,0px))]">
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
