import { dailySummaryPrompt } from "@/lib/ai/prompts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as { context?: unknown };
  const context = body.context ?? {};
  const prompt = dailySummaryPrompt(JSON.stringify(context, null, 2));

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: "You write concise daily self-improvement recaps." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    return Response.json({ error: errorText || "OpenAI request failed." }, { status: openAiResponse.status });
  }

  const payload = (await openAiResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return Response.json({
    date: new Date().toISOString().slice(0, 10),
    summary: payload.choices?.[0]?.message?.content?.trim() ?? "",
  });
}
