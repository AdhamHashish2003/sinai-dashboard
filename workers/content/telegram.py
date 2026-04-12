"""Telegram Bot API push — direct sendMessage, no Grammy dep."""

import os
import httpx


async def send_telegram(
    http: httpx.AsyncClient,
    chat_id: str | None,
    text: str,
) -> bool:
    if not chat_id:
        return False

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("  [telegram] TELEGRAM_BOT_TOKEN not set — skipping")
        return False

    if len(text) > 4000:
        text = text[:3990] + "\n\n…(truncated)"

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        resp = await http.post(
            url,
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown",
                "disable_web_page_preview": False,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            return True
        # Fallback: plain text if Markdown parsing fails
        resp2 = await http.post(
            url,
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
        return resp2.status_code == 200
    except Exception as e:
        print(f"  [telegram] error: {e}")
        return False


def format_proof_post_message(
    product_name: str,
    post_type: str,
    topic: str,
    body: str,
    pdf_url: str | None,
) -> str:
    """Build the Telegram notification for a freshly generated proof post."""
    pdf_line = f"\n📎 PDF: {pdf_url}\n" if pdf_url else ""
    return (
        f"📝 *New {product_name} proof post*\n"
        f"Type: {post_type}\n"
        f"Topic: {topic}\n"
        f"{pdf_line}\n"
        f"*Draft:*\n{body}\n\n"
        f"_Open /dashboard/content to review → Approve → Copy_"
    )
