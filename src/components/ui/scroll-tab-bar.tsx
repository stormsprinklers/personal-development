"use client";

import Link from "next/link";
import type { AppSection } from "@/lib/navigation";

type Props = {
  sections: AppSection[];
  activePath: string;
};

function isActive(section: AppSection, pathname: string) {
  if (section.href === "/") return pathname === "/";
  if (section.href === "/workouts") return pathname.startsWith("/workouts");
  return pathname === section.href || pathname.startsWith(`${section.href}/`);
}

export function ScrollTabBar({ sections, activePath }: Props) {
  return (
    <nav aria-label="App sections" className="ios-scroll-tabs overflow-x-auto">
      <div className="flex w-max min-w-full snap-x snap-mandatory gap-2">
        {sections.map((section) => {
          const active = isActive(section, activePath);
          const label = section.shortTitle ?? section.title;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`glass-button snap-start whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "glass-button-tint shadow-sm shadow-ios-tint/20"
                  : "text-ios-secondary hover:text-ios-label"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
