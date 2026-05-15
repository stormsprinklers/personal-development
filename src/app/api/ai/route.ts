type ChatRole = "system" | "user" | "assistant";

type AiRequest = {
  prompt?: string;
  temperature?: number;
  /** Full chat when set (e.g. dashboard coach). Otherwise `prompt` is sent as a single user turn. */
  messages?: Array<{ role: ChatRole; content: string }>;
};

const LEGACY_SINGLE_USER_SYSTEM = "You are a private, practical self-improvement assistant.";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured. Add it to your .env.local file." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AiRequest;
  const { temperature = 0.5 } = body;

  let messages: Array<{ role: ChatRole; content: string }>;

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const cleaned = body.messages
      .filter((m) => m && typeof m.content === "string" && m.content.trim() && (m.role === "system" || m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: m.content.trim() }));
    if (!cleaned.length) {
      return Response.json({ error: "messages must include at least one valid entry." }, { status: 400 });
    }
    if (!cleaned.some((m) => m.role === "user")) {
      return Response.json({ error: "messages must include at least one user turn." }, { status: 400 });
    }
    messages = cleaned;
  } else {
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return Response.json({ error: "Prompt is required when messages are not sent." }, { status: 400 });
    }
    messages = [
      {
        role: "system",
        content: LEGACY_SINGLE_USER_SYSTEM,
      },
      { role: "user", content: prompt },
    ];
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
      messages,
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
