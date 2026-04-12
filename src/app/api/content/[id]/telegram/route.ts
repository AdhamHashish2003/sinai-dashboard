import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/content/[id]/telegram
 * Push a proof post to the product's telegramChatId.
 * Called from the Approve button on /content so you get a copy-ready
 * message on your phone the moment you approve a draft.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const post = await db.proofPost.findUnique({
      where: { id: params.id },
      include: { product: { select: { name: true, telegramChatId: true } } },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const chatId = post.product.telegramChatId;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!chatId) {
      return NextResponse.json({ skipped: true, reason: "no_telegram_chat_id" }, { status: 200 });
    }
    if (!token) {
      return NextResponse.json({ skipped: true, reason: "no_bot_token" }, { status: 200 });
    }

    const assets = Array.isArray(post.generatedAssets)
      ? (post.generatedAssets as string[])
      : [];
    const pdfLine = assets.length > 0 ? `\n📎 ${assets[0]}\n` : "";

    const msg =
      `✅ *${post.product.name}* proof post approved\n` +
      `Type: ${post.postType}\n` +
      `Topic: ${post.topic}\n` +
      pdfLine +
      `\n*Post body:*\n${post.generatedBody}`;

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
      // Plain-text fallback
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
    console.error("[content/telegram] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
