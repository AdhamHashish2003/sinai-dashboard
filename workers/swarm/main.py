"""
LaunchForge Swarm Worker
========================
Polls for Reply rows with status='pending_draft', calls Claude Sonnet 4.6
to generate a draft, saves to DB, and pushes a Telegram notification to the
product's telegram_chat_id.

Run: python main.py [--once]
Env: DATABASE_URL, ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN (optional)
Cron: */2 * * * *
"""

import argparse
import asyncio
import os
import time

import anthropic
import httpx

from db import get_pending_drafts, save_draft, mark_draft_failed, close_pool
from draft import generate_draft
from telegram import send_telegram, format_draft_message

# Rate limit: 5 drafts per minute → 12s between calls
RATE_LIMIT_DELAY = 12


async def process_reply(
    anth: anthropic.AsyncAnthropic,
    http: httpx.AsyncClient,
    row: dict,
) -> None:
    """Draft one reply, save it, push Telegram."""
    reply_id = row["reply_id"]
    product_name = row["product_name"]

    print(f"\n[swarm] Drafting for reply {reply_id[:8]}... ({product_name})")
    print(f"  signal: {row['signal_title'][:80]}")

    signal = {
        "title": row["signal_title"],
        "body": row["signal_body"],
        "author": row["signal_author"],
        "source": row["signal_source"],
        "source_url": row["signal_source_url"],
    }
    product = {
        "name": row["product_name"],
        "valueProp": row["product_value_prop"],
        "icp": row["product_icp"],
        "freeTierHook": row["product_free_tier_hook"],
        "prodUrl": row["product_prod_url"],
    }

    # Check for regenerate note (saved in reply_notes when user clicks Regenerate)
    regenerate_note = None
    notes = row.get("reply_notes") or ""
    if notes.startswith("regenerate:"):
        regenerate_note = notes[len("regenerate:"):].strip()
        print(f"  regenerate hint: {regenerate_note}")

    # ── Draft ─────────────────────────────────────────────────────────────────
    try:
        draft = await generate_draft(anth, signal, product, regenerate_note)
        print(f"  [draft] {len(draft)} chars: {draft[:100]}...")
    except Exception as e:
        print(f"  [swarm] draft failed: {e}")
        await mark_draft_failed(reply_id, str(e))
        return

    # ── Save ──────────────────────────────────────────────────────────────────
    try:
        await save_draft(
            reply_id=reply_id,
            draft_body=draft,
            existing_versions=row.get("draft_versions"),
            regenerate_note=regenerate_note,
        )
        print(f"  [db] saved draft, status → ready_to_post")
    except Exception as e:
        print(f"  [swarm] save failed: {e}")
        return

    # ── Telegram push ─────────────────────────────────────────────────────────
    chat_id = row.get("product_telegram_chat_id")
    if chat_id:
        msg = format_draft_message(
            product_name=product_name,
            signal_title=row["signal_title"],
            signal_source_url=row["signal_source_url"],
            signal_score=row["signal_score"],
            draft=draft,
        )
        ok = await send_telegram(http, chat_id, msg)
        print(f"  [telegram] {'sent' if ok else 'skipped/failed'}")
    else:
        print(f"  [telegram] no chat_id for {product_name} — skipping")


async def main() -> None:
    # --once is a no-op for CLI consistency; this worker always runs one pass.
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="run once and exit (default)")
    parser.parse_args()

    start = time.time()
    print(f"[swarm] LaunchForge Swarm Worker starting...")
    print(f"[swarm] {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("[swarm] ANTHROPIC_API_KEY not set — exiting")
        return

    pending = await get_pending_drafts()
    print(f"[swarm] found {len(pending)} pending draft(s)")

    if not pending:
        await close_pool()
        return

    anth = anthropic.AsyncAnthropic(api_key=api_key)
    async with httpx.AsyncClient() as http:
        for i, row in enumerate(pending):
            try:
                await process_reply(anth, http, row)
            except Exception as e:
                print(f"[swarm] ERROR processing reply: {e}")

            # Rate limit between drafts (skip wait on last one)
            if i < len(pending) - 1:
                await asyncio.sleep(RATE_LIMIT_DELAY)

    await close_pool()

    elapsed = time.time() - start
    print(f"\n[swarm] done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
