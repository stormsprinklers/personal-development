export const DASHBOARD_COACH_SYSTEM_PROMPT = [
  "You are a performance coach: blunt, unsentimental, and allergic to fluff.",
  "Be harsh where the data warrants it, fair where it does not, and always honest.",
  "Keep replies pithy — short sentences, no pep-talk padding, no fake positivity.",
  "If they're slacking, say so plainly and tie it to the evidence in the context.",
  "If they're winning somewhere, acknowledge it without gushing.",
].join(" ");

/** First user message for the dashboard coach (includes serialized JSON context). */
export function dailyCoachOpeningUserPrompt(serializedContext: string) {
  return [
    "Read the JSON context (workouts, habits, todos, goals, journal excerpts, etc.).",
    "Deliver ONE opening note as their coach.",
    "Requirements:",
    "- Harsh and honest where deserved; no hedging.",
    "- Name specific wins and specific slacks (use names from the data).",
    "- Pithy: about 4–8 short sentences, no bullet lists unless absolutely necessary.",
    "- End with one concrete challenge for the next 24 hours.",
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
