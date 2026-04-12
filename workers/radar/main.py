"""
LaunchForge Radar Worker
========================
Scheduled cron job that scrapes Reddit + Hacker News for high-intent signals,
scores them with Claude Haiku, and saves score>=7 to the signals table.

Run: python main.py
Env: DATABASE_URL, ANTHROPIC_API_KEY
"""

import asyncio
import time

import httpx

from db import get_active_products, get_existing_urls, save_signals, close_pool
from scrape import scrape_reddit, scrape_hn
from score import score_posts


async def process_product(client: httpx.AsyncClient, product: dict) -> None:
    """Scrape, dedup, score, and save signals for one product."""
    name = product["name"]
    subreddits = product.get("targetSubreddits") or []
    keywords = product.get("targetKeywords") or []

    print(f"\n{'='*60}")
    print(f"[radar] Processing: {name}")
    print(f"  subreddits: {subreddits}")
    print(f"  keywords:   {keywords}")

    # ── Scrape ────────────────────────────────────────────────────────────────
    reddit_posts = await scrape_reddit(client, subreddits) if subreddits else []
    hn_posts = await scrape_hn(client, keywords) if keywords else []
    all_posts = reddit_posts + hn_posts

    print(f"  [radar] scraped {len(reddit_posts)} reddit + {len(hn_posts)} hn = {len(all_posts)} total")

    if not all_posts:
        print(f"  [radar] no posts found — done")
        return

    # ── Dedup ─────────────────────────────────────────────────────────────────
    existing = await get_existing_urls(product["id"])
    new_posts = [p for p in all_posts if p["source_url"] not in existing]
    print(f"  [radar] after dedup: {len(new_posts)} new (skipped {len(all_posts) - len(new_posts)} existing)")

    if not new_posts:
        print(f"  [radar] all posts already seen — done")
        return

    # ── Score ─────────────────────────────────────────────────────────────────
    scored = await score_posts(product, new_posts)
    high_intent = [s for s in scored if s["score"] >= 7]
    print(f"  [radar] scored {len(scored)} posts → {len(high_intent)} high-intent (score >= 7)")

    # ── Save ──────────────────────────────────────────────────────────────────
    if high_intent:
        inserted = await save_signals(product["id"], high_intent)
        print(f"  [radar] saved {inserted} signals to DB")
    else:
        print(f"  [radar] no high-intent signals to save")


async def main() -> None:
    start = time.time()
    print(f"[radar] LaunchForge Radar Worker starting...")
    print(f"[radar] {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    products = await get_active_products()
    print(f"[radar] found {len(products)} active product(s)")

    if not products:
        print("[radar] no active products — exiting")
        return

    async with httpx.AsyncClient() as client:
        for product in products:
            try:
                await process_product(client, product)
            except Exception as e:
                print(f"[radar] ERROR processing {product['name']}: {e}")

    await close_pool()

    elapsed = time.time() - start
    print(f"\n[radar] done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
