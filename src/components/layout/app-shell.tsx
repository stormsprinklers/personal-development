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
  void title;
  const pathname = usePathname();
  const { data } = useAppData();
  void data;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-sky-50/90 via-zinc-50 to-zinc-100 text-zinc-900">
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5">
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

        <main className="grid min-w-0 gap-3">{children}</main>
      </div>
    </div>
  );
}
