"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { useAppData, useTodayKey } from "@/lib/storage";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-5 w-5 shrink-0 text-ios-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function JournalPage() {
  const { data, ready, setData } = useAppData();
  const [entryText, setEntryText] = useState("");
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());

  const today = useTodayKey();
  const journalOrdered = useMemo(
    () => [...data.journalEntries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [data.journalEntries],
  );
  const recentEntries = useMemo(() => journalOrdered.slice(0, 12), [journalOrdered]);

  function addEntry() {
    if (!entryText.trim() || !today) return;
    setData((prev) => ({
      ...prev,
      journalEntries: [
        {
          id: crypto.randomUUID(),
          date: today,
          content: entryText.trim(),
          goalIds: [],
        },
        ...prev.journalEntries,
      ],
    }));
    setEntryText("");
  }

  function toggleEntryExpanded(entryId: string) {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  if (!ready || !today) return <div className="p-6">Loading journal...</div>;

  return (
    <AppShell title="Journal" description="Capture reflections and review recent entries.">
      <SectionCard title="New Entry" subtitle="Write a reflection for today." inset={false}>
        <div className="grid gap-3">
          <textarea
            value={entryText}
            onChange={(event) => setEntryText(event.target.value)}
            rows={6}
            placeholder="Write your reflection..."
            className="ios-field w-full px-4 py-3 text-sm"
          />
          <GlassButton variant="primary" onClick={addEntry}>
            Save Entry
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="Recent Entries" subtitle="Most recent journal history." inset={false}>
        <div className="grid gap-3">
          {recentEntries.map((entry) => {
            const expanded = expandedEntryIds.has(entry.id);
            const preview = entry.content.trim();
            const isLong = preview.length > 180 || preview.split("\n").length > 3;

            const body = (
              <>
                <p className="ios-footnote font-medium uppercase tracking-wide">{entry.date}</p>
                <p
                  className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ios-label ${
                    expanded || !isLong ? "" : "line-clamp-3"
                  }`}
                >
                  {entry.content}
                </p>
                {!expanded && isLong ? (
                  <p className="mt-2 text-xs font-medium text-ios-tint">Tap to read more</p>
                ) : null}
              </>
            );

            return (
              <div key={entry.id} className="ios-card min-w-0 overflow-hidden">
                {isLong ? (
                  <button
                    type="button"
                    onClick={() => toggleEntryExpanded(entry.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left"
                  >
                    <div className="min-w-0 flex-1">{body}</div>
                    <ChevronIcon expanded={expanded} />
                  </button>
                ) : (
                  <div className="px-5 py-4">{body}</div>
                )}
              </div>
            );
          })}
          {!recentEntries.length && <p className="px-2 py-3 text-sm text-ios-secondary">No entries yet.</p>}
        </div>
      </SectionCard>
    </AppShell>
  );
}
