"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_SECTIONS } from "@/lib/navigation";
import { useAppData } from "@/lib/storage";

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
  void title;
  const pathname = usePathname();
  const { data } = useAppData();
  void data;

  const onRoutineEditPage = pathname.startsWith("/workouts/routines/");
  const workoutTopActions =
    pathname === "/workouts" ? (
      <Link
        href="/workouts/settings"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate/45 bg-white text-lg text-slate shadow-sm hover:border-steel/40 hover:bg-steel/10"
        aria-label="Workout settings"
        title="Workout settings"
      >
        ⚙
      </Link>
    ) : pathname === "/workouts/settings" || onRoutineEditPage ? (
      <div className="flex shrink-0 items-center gap-2">
        {onRoutineEditPage ? (
          <Link
            href="/workouts/settings"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate/45 bg-white text-lg text-slate shadow-sm hover:border-steel/40 hover:bg-steel/10"
            aria-label="Workout settings"
            title="Workout settings"
          >
            ⚙
          </Link>
        ) : null}
        <Link
          href="/workouts"
          className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-slate/45 bg-white px-3 text-sm font-medium text-slate shadow-sm hover:border-steel/40 hover:bg-steel/10"
          aria-label="Back to workouts"
          title="Back to workouts"
        >
          ← Workouts
        </Link>
      </div>
    ) : null;

  const topRight = actions ?? workoutTopActions;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-cream via-cream to-steel/10 text-charcoal">
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5">
        {header ? <div className="min-w-0">{header}</div> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex min-w-0 flex-1 flex-wrap gap-2">
            {APP_SECTIONS.map((section) => {
              const active =
                pathname === section.href ||
                (section.href === "/workouts" && pathname.startsWith("/workouts"));
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-steel bg-steel text-white shadow-sm shadow-steel/25 hover:bg-steel/90"
                      : "border-slate/45 bg-white text-slate hover:border-steel/40 hover:bg-steel/10"
                  }`}
                >
                  {section.title}
                </Link>
              );
            })}
          </nav>
          {topRight ? <div className="flex shrink-0 items-center gap-2">{topRight}</div> : null}
        </div>

        <main className="grid min-w-0 gap-3">{children}</main>
      </div>
    </div>
  );
}
