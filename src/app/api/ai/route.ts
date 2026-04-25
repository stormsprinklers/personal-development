type AiRequest = {
  prompt: string;
  temperature?: number;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured. Add it to your .env.local file." },
      { status: 500 },
    );
  }

  const { prompt, temperature = 0.5 } = (await request.json()) as AiRequest;
  if (!prompt?.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature,
      messages: [
        {
          role: "system",
          content: "You are a private, practical self-improvement assistant.",
        },
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
  const output = payload.choices?.[0]?.message?.content?.trim() ?? "";

  return Response.json({ output });
}
