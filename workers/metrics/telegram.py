"""Telegram Bot API push — mirror of workers/swarm/telegram.py to keep each
worker service self-contained on Railway (no cross-service imports)."""

import os
import httpx


async def send_telegram(
    http: httpx.AsyncClient,
    chat_id: str | None,
    text: str,
    parse_mode: str | None = None,
) -> bool:
    if not chat_id:
        return False
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("  [telegram] TELEGRAM_BOT_TOKEN not set — skipping")
        return False

    if len(text) > 4000:
        text = text[:3990] + "\n\n…(truncated)"

    payload: dict = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    payload["disable_web_page_preview"] = True

    try:
        resp = await http.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json=payload,
            timeout=10,
        )
        if resp.status_code == 200:
            return True
        print(f"  [telegram] failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        print(f"  [telegram] error: {e}")
    return False
