import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { groqChat, cleanLlmOutput } from "@/lib/groq";

export const maxDuration = 120;

const MAX_DRAFTS_PER_RUN = 5;

const REDDIT_REPLY_PROMPT = `You are drafting a Reddit reply to a real post from someone in {product_name}'s target audience.

PRODUCT CONTEXT
- Product: {product_name}
- Value prop: {value_prop}
- ICP: {icp}
- Free tier hook: {free_tier_hook}
- Product URL: {prod_url}

YOUR JOB
Answer the user's actual question first. Be genuinely helpful. Only mention {product_name} if it directly solves their problem AND the mention fits the thread naturally. If it doesn't fit, don't mention it — a helpful reply with no product mention is infinitely better than a salesy reply that gets downvoted.

HARD RULES (violating any = automatic rejection)
- Max 150 words. Shorter is almost always better.
- NEVER start with "Great question", "Great point", "Excellent", "Love this question", or any validation opener.
- NEVER use "As an AI" or any AI disclaimer.
- NEVER end with "Hope this helps!", "Let me know if you have questions", or similar sign-offs.
- NEVER use corporate speak: "leverage", "synergy", "streamline", "holistic", "best-in-class", "game-changer", "robust".
- NEVER use em-dashes stylistically. Reddit natives use commas and periods.
- NEVER use markdown headers — Reddit supports them but they feel formal.
- NEVER use emojis unless the OP's post already has them.
- If you mention {product_name}, mention it EXACTLY ONCE, parenthetically or inline.

TONE
- Match the thread's energy. 3-sentence post → 3-sentence reply.
- First-person is natural ("I've dealt with this").
- Concrete examples beat abstract advice.
- Admit uncertainty when real ("not 100% sure but...").

OUTPUT
Return ONLY the reply text. No preamble, no "Here's a draft:", no quotes wrapping the response.`;

/**
 * POST /api/swarm/run
 * Body: { limit?: number }
 *
 * Processes pending_draft replies inline: loads the Reply+Signal+Product join,
 * calls Groq for each, saves the draft, appends to draftVersions history,
 * optionally pushes Telegram. Caps at 5 per invocation to stay under ~60s.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const limit = Math.min(
      Number(body?.limit) || MAX_DRAFTS_PER_RUN,
      MAX_DRAFTS_PER_RUN
    );

    const pending = await db.reply.findMany({
      where: { status: "pending_draft" },
      include: {
        signal: true,
        product: {
          select: {
            id: true,
            name: true,
            valueProp: true,
            icp: true,
            freeTierHook: true,
            prodUrl: true,
            groqKey: true,
            telegramChatId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        drafted: 0,
        message: "No pending drafts",
      });
    }

    const summary = {
      processed: 0,
      drafted: 0,
      telegramSent: 0,
      errors: [] as string[],
    };

    for (const reply of pending) {
      summary.processed++;

      const system = REDDIT_REPLY_PROMPT
        .replace(/{product_name}/g, reply.product.name)
        .replace("{value_prop}", reply.product.valueProp ?? "(not set)")
        .replace("{icp}", reply.product.icp ?? "(not set)")
        .replace("{free_tier_hook}", reply.product.freeTierHook ?? "(none)")
        .replace("{prod_url}", reply.product.prodUrl ?? "(not set)");

      const regenerateNote =
        reply.notes?.startsWith("regenerate:")
          ? reply.notes.replace("regenerate:", "").trim()
          : null;

      const userMsgLines = [
        `Subreddit/source: ${reply.signal.source}`,
        `Post author: ${reply.signal.author}`,
        "",
        "POST TITLE:",
        reply.signal.title || "(no title)",
        "",
        "POST BODY:",
        reply.signal.body || "(no body — reply to the title)",
      ];
      if (regenerateNote) {
        userMsgLines.push(
          "",
          `REGENERATE INSTRUCTION: Your previous draft was rejected. Try a different angle. Hint: ${regenerateNote}`
        );
      }

      let draft: string;
      try {
        const raw = await groqChat(
          [
            { role: "system", content: system },
            { role: "user", content: userMsgLines.join("\n") },
          ],
          {
            maxTokens: 600,
            temperature: 0.7,
            apiKey: reply.product.groqKey ?? undefined,
          }
        );
        draft = cleanLlmOutput(raw);
      } catch (err) {
        summary.errors.push(
          `draft ${reply.id.slice(0, 8)}: ${err instanceof Error ? err.message.slice(0, 100) : "unknown"}`
        );
        await db.reply.update({
          where: { id: reply.id },
          data: { notes: `draft error: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}` },
        });
        continue;
      }

      // Append to draftVersions history
      const existingVersions = Array.isArray(reply.draftVersions)
        ? (reply.draftVersions as Array<{ body: string; note?: string }>)
        : [];
      const newVersions = [
        ...existingVersions,
        { body: draft, ...(regenerateNote ? { note: regenerateNote } : {}) },
      ];

      await db.reply.update({
        where: { id: reply.id },
        data: {
          draftBody: draft,
          draftVersions: newVersions,
          status: "ready_to_post",
          notes: null,
        },
      });

      summary.drafted++;

      // Telegram push (fire-and-forget best effort)
      const chatId = reply.product.telegramChatId;
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (chatId && token) {
        const msg =
          `🎯 *New draft for ${reply.product.name}*\n` +
          `Score: ${reply.signal.score}/10\n\n` +
          `*Signal:* ${reply.signal.title.slice(0, 200)}\n` +
          `${reply.signal.sourceUrl}\n\n` +
          `*Draft:*\n${draft}\n\n` +
          `_Review on /dashboard/swarm_`;

        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg.length > 4000 ? msg.slice(0, 3990) + "\n…" : msg,
              parse_mode: "Markdown",
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (tgRes.ok) summary.telegramSent++;
        } catch {
          /* ignore telegram errors — draft already saved */
        }
      }
    }

    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("[swarm/run] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
