export function dailySummaryPrompt(serializedContext: string) {
  return [
    "You are an elite but practical self-improvement coach.",
    "Write exactly one concise paragraph (4-6 sentences).",
    "Include: accomplishments, gaps, and one specific recommendation for tomorrow.",
    "Use supportive tone and avoid fluff.",
    "",
    "Context:",
    serializedContext,
  ].join("\n");
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
