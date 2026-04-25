"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_SECTIONS } from "@/lib/navigation";
import { useAppData } from "@/lib/storage";

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ title, description: _description, children }: AppShellProps) {
  void _description;
  const pathname = usePathname();
  const { data } = useAppData();
  const firstName = data.userProfile.name.split(/\s+/)[0] ?? data.userProfile.name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/90 via-zinc-50 to-zinc-100 text-zinc-900">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5">
        <header className="rounded-2xl border border-sky-200/80 bg-white p-6 shadow-sm shadow-sky-100/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700/80">
            Personal Development Hub
          </p>
          <p className="mt-2 text-sm font-medium text-sky-800">Welcome, {firstName}.</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{title}</h1>
        </header>

        <nav className="flex flex-wrap gap-2">
          {APP_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                pathname === section.href
                  ? "border-sky-500 bg-sky-600 text-white shadow-sm shadow-sky-200/60 hover:bg-sky-700"
                  : "border-sky-200/90 bg-white text-zinc-700 hover:border-sky-300 hover:bg-sky-50/80"
              }`}
            >
              {section.title}
            </Link>
          ))}
        </nav>

        <main className="grid gap-3">{children}</main>
      </div>
    </div>
  );
}
