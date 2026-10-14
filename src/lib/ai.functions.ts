import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type CompletionPayload = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
};

async function callAI(messages: ChatMessage[]) {
  const key = process.env["OPENAI_API_KEY"];

  if (!key) {
    throw new Error(
      "AI is not connected. Add OPENAI_API_KEY as a server-side environment variable and restart the app.",
    );
  }

  const base = (process.env["OPENAI_API_BASE"] ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = `${base}/chat/completions`;
  const model = process.env["AEVIA_AI_MODEL"] ?? "gpt-5-mini";

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_completion_tokens: 900 }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("The AI request took too long. Please try again.");
    }
    throw new Error("The AI service could not be reached. Check the server connection and retry.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("The AI provider rejected its server key. Check OPENAI_API_KEY and retry.");
  }
  if (response.status === 429) {
    throw new Error("The AI service is busy. Wait a moment and try again.");
  }
  if (!response.ok) {
    throw new Error(
      `The AI provider returned HTTP ${response.status}. Check the model and endpoint settings.`,
    );
  }

  const result = (await response.json()) as CompletionPayload;
  const choice = result.choices?.[0];
  const content = choice?.message?.content;
  if (choice?.finish_reason === "length") {
    throw new Error("The AI answer reached its length limit. Try a shorter question.");
  }
  const reply =
    typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content
            .map((part) => part.text ?? "")
            .join("\n")
            .trim()
        : "";
  if (!reply) throw new Error("The AI provider returned an empty answer. Please try again.");
  return reply;
}

export const askAI = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        tone: z.enum(["friendly", "short", "detailed", "funny"]).optional(),
        answerLength: z.enum(["short", "medium", "long"]).optional(),
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().trim().min(1).max(4000),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const reply = await callAI([
      {
        role: "system",
        content: `You are AEVIA Intelligence, a calm, precise research assistant for a student technology project covering AR hand tracking, Indian crime data (NCRB) and AI news. Answer clearly in plain language, using short paragraphs. Avoid Markdown emphasis markers. If a list is useful, complete every item. The user's preferred tone is ${data.tone ?? "friendly"}; follow it without becoming distracting. The preferred answer length is ${data.answerLength ?? "medium"}; keep the answer under ${data.answerLength === "short" ? 90 : data.answerLength === "long" ? 320 : 220} words unless asked.`,
      },
      ...data.messages,
    ]);
    return { reply };
  });

export const summarizeStory = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        title: z.string().trim().min(1).max(300),
        body: z.string().trim().min(1).max(6000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const summary = await callAI([
      {
        role: "system",
        content:
          "Summarise the news story in exactly three short, plain-language sentences suitable for reading aloud. No preamble, no bullet points.",
      },
      { role: "user", content: `${data.title}\n\n${data.body}` },
    ]);
    return { summary };
  });
