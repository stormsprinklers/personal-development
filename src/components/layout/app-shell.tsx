"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_SECTIONS } from "@/lib/navigation";

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Personal Development Hub
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-600">Welcome, Austin.</p>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        </header>

        <nav className="flex flex-wrap gap-2">
          {APP_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                pathname === section.href
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white hover:bg-zinc-100"
              }`}
            >
              {section.title}
            </Link>
          ))}
        </nav>

        <main className="grid gap-4">{children}</main>
      </div>
    </div>
  );
}
