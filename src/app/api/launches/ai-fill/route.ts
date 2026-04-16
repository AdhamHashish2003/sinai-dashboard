import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { groqChat } from "@/lib/groq";
import { paragraphSchema } from "@/types/launch";
import { SYSTEM_PROMPT, MODEL_ID, parseAiResponse } from "./prompt";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedInput = paragraphSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid paragraph", details: parsedInput.error.flatten() },
      { status: 400 }
    );
  }

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: parsedInput.data.paragraph },
  ];

  async function attempt() {
    return groqChat(messages, {
      maxTokens: 1200,
      temperature: 0.3,
      jsonMode: true,
    });
  }

  let raw: string;
  try {
    raw = await attempt();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (/429|rate|busy/i.test(msg)) {
      return NextResponse.json(
        { error: "Groq rate-limited, retry shortly", detail: msg },
        { status: 503 }
      );
    }
    console.error("[launches/ai-fill] groq error:", msg);
    return NextResponse.json({ error: "Upstream LLM error", detail: msg }, { status: 502 });
  }

  let form;
  try {
    form = parseAiResponse(raw);
  } catch (err) {
    console.warn("[launches/ai-fill] first parse failed, retrying:", err instanceof Error ? err.message : err);
    try {
      const retryRaw = await attempt();
      form = parseAiResponse(retryRaw);
    } catch (retryErr) {
      const detail =
        retryErr instanceof ZodError
          ? retryErr.flatten()
          : retryErr instanceof Error
            ? retryErr.message
            : "unknown";
      return NextResponse.json(
        { error: "AI output malformed, try rephrasing", detail },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    ...form,
    _meta: { model: MODEL_ID, generatedAt: new Date().toISOString() },
  });
}
