import type { AppData } from "@/lib/models";
import { yearInAppTimezone } from "@/lib/timezone";

export function motivationalPushPrompt(data: AppData, dateKey: string): string {
  const year = yearInAppTimezone();
  const activeGoals = data.goals
    .filter((g) => !g.completed && g.year === year)
    .slice(0, 6)
    .map((g) => g.title);
  const habits = data.habits.filter((h) => h.active).map((h) => h.name).slice(0, 8);
  const habitsDoneToday = data.habitLogs.filter((l) => l.date === dateKey && l.completed).length;
  const habitTarget = habits.length;
  const recentWorkout = [...data.workoutSessions].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const journalToday = data.journalEntries.some((e) => e.date === dateKey);

  return [
    "Write exactly one short motivational sentence (max 140 characters) for a personal progress app push notification.",
    "Ground it in the user's real goals and recent progress. Be warm and specific, never preachy or guilt-inducing.",
    "Do not use quotation marks. Do not add a greeting or emoji spam (at most one emoji if it fits).",
    "",
    `Today: ${dateKey}`,
    `Active goals: ${activeGoals.length ? activeGoals.join("; ") : "none listed"}`,
    `Habits today: ${habitsDoneToday}/${habitTarget}${habits.length ? ` (${habits.join(", ")})` : ""}`,
    `Latest workout date: ${recentWorkout?.date ?? "none"}`,
    `Journaled today: ${journalToday ? "yes" : "no"}`,
  ].join("\n");
}

export async function generateMotivationalSentence(data: AppData, dateKey: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content: "You write concise, respectful motivational push notifications grounded in the user's data.",
        },
        { role: "user", content: motivationalPushPrompt(data, dateKey) },
      ],
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
  return text || null;
}
