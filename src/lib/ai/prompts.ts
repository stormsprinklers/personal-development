export const DASHBOARD_COACH_SYSTEM_PROMPT = [
  "You are a practical personal progress assistant.",
  "Be neutral, respectful, and evidence-based. Never lecture, guilt-trip, or use harsh or condescending language.",
  "Ground every point in the provided context. If data is thin, note that briefly instead of inventing trends.",
  "In follow-up replies, stay concise and answer the user's question directly.",
].join(" ");

/** First user message for the dashboard coach (includes serialized JSON context). */
export function dailyCoachOpeningUserPrompt(serializedContext: string) {
  return [
    "Read the JSON context (workouts, habits, todos, goals, journal excerpts, etc.).",
    "Write a short daily brief using exactly this structure (markdown headings):",
    "",
    "### Trends",
    "- Exactly 3 bullet points summarizing patterns or trajectories from the data (habits, workouts, todos, goals, journal—whatever the data supports).",
    "- Each bullet is one sentence; be specific when possible (names, counts, timeframes from the data).",
    "",
    "### Suggested actions",
    "- Exactly 3 bullet points: concrete next steps that would move the user toward their stated goals.",
    "- Each action should be doable and tied to something in the context.",
    "",
    "Rules:",
    "- No opening pleasantries, emotional pep talk, or scolding.",
    "- Do not add extra sections or more than 3 bullets per section.",
    "",
    "Context JSON:",
    serializedContext,
  ].join("\n");
}

/** @deprecated Use dailyCoachOpeningUserPrompt — kept for any stray imports. */
export function dailySummaryPrompt(serializedContext: string) {
  return dailyCoachOpeningUserPrompt(serializedContext);
}

export function journalAnalysisPrompt(journalText: string, serializedContext: string) {
  return [
    "You are a reflective psychology-focused assistant.",
    "Analyze the journal entry with grounded insights.",
    "Output 3 sections with short bullets: Patterns, Risks, Next Actions.",
    "Keep it practical and non-clinical.",
    "",
    "Journal entry:",
    journalText,
    "",
    "Broader context:",
    serializedContext,
  ].join("\n");
}

export function qaPrompt(question: string, serializedContext: string) {
  return [
    "Answer the user's question using only the provided context when possible.",
    "If information is missing, say what is missing and provide a best-effort recommendation.",
    "",
    `Question: ${question}`,
    "",
    "Context:",
    serializedContext,
  ].join("\n");
}
