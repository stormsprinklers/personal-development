"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { AiSummaryText } from "@/components/ai/ai-summary-text";
import { VoiceMemoRecorder, type TranscribedVoiceMemo } from "@/components/journal/voice-memo-recorder";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { journalAnalysisPrompt } from "@/lib/ai/prompts";
import { isVoiceMemoExpired } from "@/lib/journal/voice-memo";
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
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [aiOutput, setAiOutput] = useState("");
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());
  const [pendingVoiceMemo, setPendingVoiceMemo] = useState<TranscribedVoiceMemo["voiceMemo"] | null>(null);

  const today = useTodayKey();
  const journalOrdered = useMemo(
    () => [...data.journalEntries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [data.journalEntries],
  );
  const recentEntries = useMemo(() => journalOrdered.slice(0, 12), [journalOrdered]);

  function toggleGoal(goalId: string) {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId],
    );
  }

  function handleVoiceTranscribed(result: TranscribedVoiceMemo) {
    setEntryText((prev) => (prev.trim() ? `${prev.trim()}\n\n${result.transcript}` : result.transcript));
    setPendingVoiceMemo(result.voiceMemo);
  }

  async function addEntry() {
    if (!entryText.trim() || !today) return;
    const entryId = crypto.randomUUID();
    const voiceMemo = pendingVoiceMemo ?? undefined;
    setData((prev) => ({
      ...prev,
      journalEntries: [
        {
          id: entryId,
          date: today,
          content: entryText.trim(),
          goalIds: selectedGoalIds,
          ...(voiceMemo ? { voiceMemo } : {}),
        },
        ...prev.journalEntries,
      ],
    }));
    setEntryText("");
    setSelectedGoalIds([]);
    setPendingVoiceMemo(null);

    if (voiceMemo) {
      try {
        await fetch("/api/journal/voice-memo/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceMemoId: voiceMemo.id, journalEntryId: entryId }),
        });
      } catch {
        // Entry is saved locally; link can be retried on next sync if needed.
      }
    }
  }

  async function analyzeLatestEntry() {
    const latest = journalOrdered[0];
    if (!latest || !today) return;
    const context = buildAiContext(data, today);
    const prompt = journalAnalysisPrompt(latest.content, JSON.stringify(context, null, 2));
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, temperature: 0.6 }),
    });
    const payload = (await response.json()) as { output?: string; error?: string };
    setAiOutput(payload.output ?? payload.error ?? "No analysis returned.");

    if (!payload.output) return;
    setData((prev) => ({
      ...prev,
      aiInsights: [
        { id: crypto.randomUUID(), type: "journal_analysis", date: today, prompt, output: payload.output ?? "" },
        ...prev.aiInsights,
      ],
    }));
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
    <AppShell
      title="Journal"
      description="Write entries, link goals, and run AI analysis."
    >
      <SectionCard title="New Entry" subtitle="Create unlimited journal entries and link to relevant goals." inset={false}>
        <div className="grid gap-3">
          <VoiceMemoRecorder onTranscribed={handleVoiceTranscribed} />
          {pendingVoiceMemo && !isVoiceMemoExpired(pendingVoiceMemo.expiresAt) ? (
            <p className="ios-footnote text-ios-secondary">
              Voice memo attached — audio available for playback until{" "}
              {new Date(pendingVoiceMemo.expiresAt).toLocaleDateString()}.
            </p>
          ) : null}
          <textarea
            value={entryText}
            onChange={(event) => setEntryText(event.target.value)}
            rows={6}
            placeholder="Write your reflection..."
            className="ios-field w-full px-4 py-3 text-sm"
          />
          <div className="grid gap-2 md:grid-cols-3">
            {data.goals.map((goal) => (
              <label key={goal.id} className="ios-card-muted flex items-center gap-2 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedGoalIds.includes(goal.id)}
                  onChange={() => toggleGoal(goal.id)}
                />
                {goal.title}
              </label>
            ))}
          </div>
          <GlassButton variant="primary" onClick={addEntry}>
            Save Entry
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="AI Analysis" subtitle="Analyze your latest journal entry." inset={false}>
        <div className="grid gap-3">
          <GlassButton variant="primary" onClick={() => void analyzeLatestEntry()}>
            Analyze Latest Entry
          </GlassButton>
          <div className="ios-card-muted p-4">
            {aiOutput ? <AiSummaryText text={aiOutput} /> : <p className="text-sm text-ios-label">AI output will appear here.</p>}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent Entries" subtitle="Most recent journal history and linked goals." inset={false}>
        <div className="grid gap-3">
          {recentEntries.map((entry) => {
            const linkedTitles = entry.goalIds
              .map((id) => data.goals.find((g) => g.id === id)?.title)
              .filter((t): t is string => Boolean(t));
            const expanded = expandedEntryIds.has(entry.id);
            const preview = entry.content.trim();
            const isLong = preview.length > 180 || preview.split("\n").length > 3;
            const showVoicePlayback =
              entry.voiceMemo && !isVoiceMemoExpired(entry.voiceMemo.expiresAt);

            const body = (
              <>
                <p className="ios-footnote font-medium uppercase tracking-wide">{entry.date}</p>
                {linkedTitles.length ? (
                  <p className="mt-1 text-xs text-ios-secondary">Linked goals: {linkedTitles.join(", ")}</p>
                ) : null}
                {showVoicePlayback ? (
                  <audio
                    controls
                    preload="none"
                    src={`/api/journal/voice-memo/${entry.voiceMemo!.id}`}
                    className="mt-3 w-full"
                  />
                ) : null}
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
