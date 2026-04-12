/**
 * Thin Groq client — chat completions only.
 *
 * Mirrors the Python AsyncGroq usage in workers/ so TypeScript API routes
 * can invoke the same models (llama-3.3-70b-versatile) without shelling out.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  apiKey?: string;
}

export async function groqChat(
  messages: GroqMessage[],
  opts: GroqOptions = {}
): Promise<string> {
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set");
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 600,
    temperature: opts.temperature ?? 0.6,
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string | null } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  return text.trim();
}

/**
 * Strip common wrappers (code fences, "Here's a draft:" preambles, wrapping quotes)
 * from an LLM response before saving.
 */
export function cleanLlmOutput(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  if (cleaned.startsWith("```")) {
    const parts = cleaned.split("```");
    if (parts.length >= 3) {
      let inner = parts[1];
      if (inner.includes("\n")) {
        const [firstLine, ...rest] = inner.split("\n");
        if (/^(markdown|text|md|json|reddit)$/i.test(firstLine.trim())) {
          inner = rest.join("\n");
        }
      }
      cleaned = inner;
    }
    cleaned = cleaned.trim();
  }

  const preambles = [
    "Here's a draft:",
    "Here is a draft:",
    "Here's my draft:",
    "Here's the post:",
    "Here's the reply:",
    "Draft:",
    "Reply:",
    "Post:",
  ];
  for (const p of preambles) {
    if (cleaned.toLowerCase().startsWith(p.toLowerCase())) {
      cleaned = cleaned.slice(p.length).trim();
    }
  }

  return cleaned;
}
