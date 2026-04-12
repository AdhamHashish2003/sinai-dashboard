"""Telegram Bot API push (no Grammy dependency — direct sendMessage)."""

import os
import httpx


async def send_telegram(
    http: httpx.AsyncClient,
    chat_id: str | None,
    text: str,
) -> bool:
    """
    Push a message to Telegram via the Bot API.
    Silently skips if chat_id or TELEGRAM_BOT_TOKEN is missing.
    Returns True on success, False otherwise.
    """
    if not chat_id:
        return False

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("  [telegram] TELEGRAM_BOT_TOKEN not set — skipping push")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    # Telegram message limit is 4096 chars; truncate with ellipsis if needed
    if len(text) > 4000:
        text = text[:3990] + "\n\n…(truncated)"

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
        # Fall back to plain text if Markdown parse fails (common with special chars)
        if resp.status_code == 400:
            resp2 = await http.post(
                url,
                json={"chat_id": chat_id, "text": text},
                timeout=10,
            )
            if resp2.status_code == 200:
                return True
            print(f"  [telegram] failed ({resp2.status_code}): {resp2.text[:200]}")
        else:
            print(f"  [telegram] failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        print(f"  [telegram] error: {e}")

    return False


def format_draft_message(
    product_name: str,
    signal_title: str,
    signal_source_url: str,
    signal_score: int,
    draft: str,
) -> str:
    """Build the Telegram message body for a new draft."""
    return (
        f"🎯 *New draft for {product_name}*\n"
        f"Score: {signal_score}/10\n\n"
        f"*Signal:* {signal_title[:200]}\n"
        f"{signal_source_url}\n\n"
        f"*Draft:*\n{draft}\n\n"
        f"_Open /swarm in LaunchForge to review → Copy → paste to Reddit_"
    )
