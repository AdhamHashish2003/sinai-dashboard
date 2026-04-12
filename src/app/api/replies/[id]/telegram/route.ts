import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/replies/[id]/telegram
 * Re-pushes a reply draft to the product's telegramChatId.
 * Triggered from the Copy button on /swarm so the user can also receive
 * the draft on their phone for on-the-go pasting.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const reply = await db.reply.findUnique({
      where: { id },
      include: {
        signal: true,
        product: { select: { name: true, telegramChatId: true } },
      },
    });

    if (!reply) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const chatId = reply.product.telegramChatId;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!chatId) {
      return NextResponse.json(
        { skipped: true, reason: "no_telegram_chat_id" },
        { status: 200 }
      );
    }
    if (!token) {
      return NextResponse.json(
        { skipped: true, reason: "no_bot_token" },
        { status: 200 }
      );
    }
    if (!reply.draftBody) {
      return NextResponse.json(
        { error: "Draft not ready yet" },
        { status: 409 }
      );
    }

    const msg =
      `🎯 *${reply.product.name}* — draft re-sent from /swarm\n` +
      `Score: ${reply.signal.score}/10\n\n` +
      `*Signal:* ${reply.signal.title.slice(0, 200)}\n` +
      `${reply.signal.sourceUrl}\n\n` +
      `*Draft:*\n${reply.draftBody}`;

    // Truncate to Telegram's 4096 char limit
    const text = msg.length > 4000 ? msg.slice(0, 3990) + "\n\n…(truncated)" : msg;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });

    if (!tgRes.ok) {
      // Fall back to plain text (Markdown can fail with special chars)
      const fallback = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      if (!fallback.ok) {
        const errText = await fallback.text();
        return NextResponse.json(
          { error: "Telegram push failed", detail: errText.slice(0, 200) },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[replies/telegram] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
