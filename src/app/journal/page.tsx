"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { journalAnalysisPrompt, qaPrompt } from "@/lib/ai/prompts";
import { todayKey, useAppData } from "@/lib/storage";

export default function JournalPage() {
  const { data, ready, setData } = useAppData();
  const [entryText, setEntryText] = useState("");
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [aiOutput, setAiOutput] = useState("");

  const today = todayKey();
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

  function addEntry() {
    if (!entryText.trim()) return;
    setData((prev) => ({
      ...prev,
      journalEntries: [
        { id: crypto.randomUUID(), date: today, content: entryText.trim(), goalIds: selectedGoalIds },
        ...prev.journalEntries,
      ],
    }));
    setEntryText("");
    setSelectedGoalIds([]);
  }

  async function analyzeLatestEntry() {
    const latest = journalOrdered[0];
    if (!latest) return;
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

  async function askAiQuestion() {
    if (!question.trim()) return;
    const context = buildAiContext(data, today);
    const prompt = qaPrompt(question, JSON.stringify(context, null, 2));
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, temperature: 0.4 }),
    });
    const payload = (await response.json()) as { output?: string; error?: string };
    setAiOutput(payload.output ?? payload.error ?? "No answer returned.");

    if (!payload.output) return;
    setData((prev) => ({
      ...prev,
      aiInsights: [{ id: crypto.randomUUID(), type: "qa", date: today, prompt, output: payload.output ?? "" }, ...prev.aiInsights],
    }));
    setQuestion("");
  }

  if (!ready) return <div className="p-6">Loading journal...</div>;

  return (
    <AppShell
      title="Journal"
      description="Write entries, link goals, and run AI analysis."
    >
      <SectionCard title="New Entry" subtitle="Create unlimited journal entries and link to relevant goals.">
        <div className="grid gap-3">
          <textarea
            value={entryText}
            onChange={(event) => setEntryText(event.target.value)}
            rows={6}
            placeholder="Write your reflection..."
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <div className="grid gap-2 md:grid-cols-3">
            {data.goals.map((goal) => (
              <label key={goal.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedGoalIds.includes(goal.id)}
                  onChange={() => toggleGoal(goal.id)}
                />
                {goal.title}
              </label>
            ))}
          </div>
          <div>
            <button onClick={addEntry} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
              Save Entry
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="AI Analysis + Q&A" subtitle="Analyze your latest entry or ask context-based questions.">
        <div className="grid gap-3">
          <div className="flex gap-2">
            <button onClick={analyzeLatestEntry} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
              Analyze Latest Entry
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask AI about your progress and patterns..."
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button onClick={askAiQuestion} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
              Ask
            </button>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm whitespace-pre-wrap">
            {aiOutput || "AI output will appear here."}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent Entries" subtitle="Most recent journal history and linked goals.">
        <div className="grid gap-2">
          {recentEntries.map((entry) => {
            const linkedTitles = entry.goalIds
              .map((id) => data.goals.find((g) => g.id === id)?.title)
              .filter((t): t is string => Boolean(t));
            return (
              <div key={entry.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{entry.date}</p>
                {linkedTitles.length ? (
                  <p className="mb-2 text-xs text-zinc-500">Linked goals: {linkedTitles.join(", ")}</p>
                ) : null}
                <p className="whitespace-pre-wrap">{entry.content}</p>
              </div>
            );
          })}
          {!recentEntries.length && <p className="text-sm text-zinc-600">No entries yet.</p>}
        </div>
      </SectionCard>
    </AppShell>
  );
}
