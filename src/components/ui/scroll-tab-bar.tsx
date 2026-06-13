"use client";

import { isAppSectionActive, type AppSection } from "@/lib/navigation";
import { useTabTransition } from "@/components/layout/tab-transition";

type Props = {
  sections: AppSection[];
  activePath: string;
};

function isActive(section: AppSection, pathname: string) {
  return isAppSectionActive(section, pathname);
}

export function ScrollTabBar({ sections, activePath }: Props) {
  const { navigateToTab, animating } = useTabTransition();

  return (
    <nav aria-label="App sections" className="min-w-0">
      <div className="ios-scroll-tabs overflow-x-auto pb-3 pt-0.5">
        <div className="flex w-max min-w-full snap-x snap-mandatory gap-2">
          {sections.map((section) => {
            const active = isActive(section, activePath);
            const label = section.shortTitle ?? section.title;
            return (
              <button
                key={section.href}
                type="button"
                disabled={animating}
                onClick={() => {
                  if (active) return;
                  navigateToTab(section.href);
                }}
                className={`glass-button inline-flex snap-start items-center whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  active ? "glass-button-tint text-white" : "text-ios-label"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
