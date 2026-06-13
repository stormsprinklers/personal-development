"use client";

import Link from "next/link";
import { APP_SECTIONS, isAppSectionActive } from "@/lib/navigation";
import type { AppSection } from "@/lib/navigation";

type Props = {
  sections: AppSection[];
  activePath: string;
};

function isActive(section: AppSection, pathname: string) {
  return isAppSectionActive(section, pathname);
}

export function ScrollTabBar({ sections, activePath }: Props) {
  return (
    <nav aria-label="App sections" className="min-w-0">
      <div className="ios-scroll-tabs overflow-x-auto pb-3 pt-0.5">
        <div className="flex w-max min-w-full snap-x snap-mandatory gap-2">
          {sections.map((section) => {
            const active = isActive(section, activePath);
            const label = section.shortTitle ?? section.title;
            return (
              <Link
                key={section.href}
                href={section.href}
                className={`glass-button inline-flex snap-start items-center whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "glass-button-tint text-white" : "text-ios-label"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
