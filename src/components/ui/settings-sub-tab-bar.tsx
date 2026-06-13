"use client";

type SubTab = {
  id: string;
  label: string;
};

type Props = {
  tabs: readonly SubTab[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function SettingsSubTabBar({ tabs, activeId, onSelect }: Props) {
  return (
    <nav aria-label="Settings sections" className="min-w-0">
      <div className="ios-scroll-tabs overflow-x-auto pb-1">
        <div className="flex w-max min-w-full snap-x snap-mandatory gap-2">
          {tabs.map((tab) => {
            const active = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                className={`glass-button inline-flex snap-start items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "glass-button-tint text-white" : "text-ios-label"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
