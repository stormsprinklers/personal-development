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
  /** Optional right-side controls in the top bar (overrides workout defaults when set). */
  actions?: ReactNode;
};

export function AppShell({ title, description: _description, children, actions }: AppShellProps) {
  void _description;
  void title;
  const pathname = usePathname();
  const { data } = useAppData();
  void data;

  const workoutTopActions =
    pathname === "/workouts" ? (
      <Link
        href="/workouts/settings"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200/90 bg-white text-lg text-zinc-700 shadow-sm hover:border-sky-300 hover:bg-sky-50/80"
        aria-label="Workout settings"
        title="Workout settings"
      >
        ⚙
      </Link>
    ) : pathname === "/workouts/settings" ? (
      <Link
        href="/workouts"
        className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-sky-200/90 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:border-sky-300 hover:bg-sky-50/80"
        aria-label="Back to workouts"
        title="Back to workouts"
      >
        ← Workouts
      </Link>
    ) : null;

  const topRight = actions ?? workoutTopActions;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-sky-50/90 via-zinc-50 to-zinc-100 text-zinc-900">
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5">
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
                      ? "border-sky-500 bg-sky-600 text-white shadow-sm shadow-sky-200/60 hover:bg-sky-700"
                      : "border-sky-200/90 bg-white text-zinc-700 hover:border-sky-300 hover:bg-sky-50/80"
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
