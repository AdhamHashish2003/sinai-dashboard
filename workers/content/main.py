"""
LaunchForge Content Flywheel Worker
====================================
Daily cron (7am PT = 14:00 UTC during DST, 15:00 UTC during PST):

  1. Load all active products.
  2. For each, check day-of-week rotation in product_configs/{slug}.yml.
  3. Pick a post_type for today (skip days map to 'null').
  4. Skip if a post of that type was already generated today (dedup).
  5. Pick a topic (city weighted by log-population, excluding cities used
     in the last 30 days for this product).
  6. Optionally call PermitAI /api/analyze + /api/report/pdf if
     PERMITAI_AUTH_TOKEN is set (feature flag).
  7. Generate post body with Claude Sonnet 4.6 using prompts/*.md.
  8. Save to ProofPost table with status='draft'.
  9. Push Telegram notification to product.telegramChatId.

Run: python main.py
Optional args: --product-slug <slug> --post-type <type>  (for manual / on-demand)
Env: DATABASE_URL, GROQ_API_KEY, TELEGRAM_BOT_TOKEN (optional),
     PERMITAI_AUTH_TOKEN (optional, unlocks PDF generation)
Cron: 0 14 * * *  (7am PDT / 6am PST — adjust if DST matters)
"""

import argparse
import asyncio
import datetime as dt
import math
import os
import random
import sys
import time
from pathlib import Path

import httpx
import yaml
from groq import AsyncGroq

from db import (
    get_active_products,
    already_posted_today,
    cities_used_in_last_30d,
    create_proof_post,
    close_pool,
)
from generate import generate_post_body
from permitai import list_cities, analyze_city, generate_pdf_report
from telegram import send_telegram, format_proof_post_message

CONFIGS_DIR = Path(__file__).parent / "product_configs"


def load_product_config(product_slug: str) -> dict | None:
    path = CONFIGS_DIR / f"{product_slug}.yml"
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def pick_post_type(config: dict, override: str | None = None) -> str | None:
    """Round-robin post_type based on weekday, or override if provided."""
    if override:
        return override
    weekday = dt.datetime.utcnow().weekday()  # Mon=0
    rotation = config.get("rotation", {})
    # YAML keys may come back as int or str depending on parser
    return rotation.get(weekday) or rotation.get(str(weekday))


def pick_city(config: dict, excluded_names: set[str]) -> dict | None:
    """Population-weighted random city, excluding those used in last 30d."""
    cities = config.get("cities", [])
    eligible = [c for c in cities if c["name"] not in excluded_names]
    if not eligible:
        # Fall back to the full pool if everything was excluded (pool exhausted)
        print(f"  [content] all cities in 30d window — reusing pool")
        eligible = cities
    if not eligible:
        return None

    # Log-scale weight so medium cities still surface; floor at 1
    weights = [max(1.0, math.log10(max(c.get("population", 1), 1))) for c in eligible]
    return random.choices(eligible, weights=weights, k=1)[0]


def pick_comparison_cities(config: dict, n: int = 3) -> list[dict]:
    """Pick N random cities for a fee_comparison post (weighted by population)."""
    cities = config.get("cities", [])
    if len(cities) < n:
        return cities
    weights = [max(1.0, math.log10(max(c.get("population", 1), 1))) for c in cities]
    picks: list[dict] = []
    pool = cities.copy()
    pool_weights = weights.copy()
    for _ in range(n):
        if not pool:
            break
        idx = random.choices(range(len(pool)), weights=pool_weights, k=1)[0]
        picks.append(pool.pop(idx))
        pool_weights.pop(idx)
    return picks


async def process_product(
    llm: AsyncGroq,
    http: httpx.AsyncClient,
    product: dict,
    post_type_override: str | None = None,
) -> None:
    product_slug = product["slug"]
    product_name = product["name"]

    config = load_product_config(product_slug)
    if not config:
        print(f"[content] no config for {product_slug} — skipping")
        return

    post_type = pick_post_type(config, post_type_override)
    if not post_type:
        print(f"[content] {product_slug}: rotation skip day ({dt.datetime.utcnow().strftime('%A')})")
        return

    print(f"\n[content] {product_slug} → post_type={post_type}")

    # Dedup: skip if we already generated this type today
    if not post_type_override and await already_posted_today(product["id"], post_type):
        print(f"  [content] already generated {post_type} today — skip")
        return

    # ── Pick topic ────────────────────────────────────────────────────────────
    topic: dict = {}
    excluded = await cities_used_in_last_30d(product["id"])

    if post_type == "fee_comparison":
        picks = pick_comparison_cities(config, n=3)
        if not picks:
            print(f"  [content] no cities available")
            return
        topic = {
            "name": " vs ".join(p["name"] for p in picks),
            "state": picks[0]["state"],
            "cities_list": ", ".join(p["name"] for p in picks),
        }
    else:
        city = pick_city(config, excluded)
        if not city:
            print(f"  [content] no eligible city")
            return
        topic = {
            "name": city["name"],
            "state": city["state"],
            "city_id": city["id"],
        }

    print(f"  [content] topic: {topic['name']}")

    # ── Optional: PermitAI analyze + PDF (feature-flagged) ────────────────────
    pdf_url: str | None = None
    assets: list[str] = []

    if post_type == "city_report" and topic.get("city_id"):
        analysis = await analyze_city(http, topic["city_id"], project_type="adu")
        if analysis:
            # The shape is unknown without auth — coerce to text
            analysis_text = (
                analysis.get("summary")
                or analysis.get("text")
                or str(analysis)[:3000]
            )
            pdf_url = await generate_pdf_report(http, analysis_text, topic["name"])
            if pdf_url:
                assets.append(pdf_url)
                print(f"  [content] PDF: {pdf_url}")
        else:
            print(f"  [content] analyze skipped (no PERMITAI_AUTH_TOKEN or failed)")

    # ── Generate post body with Groq Llama ────────────────────────────────────
    try:
        body = await generate_post_body(
            llm,
            product,
            post_type,
            topic,
            pdf_reference=pdf_url,
        )
        print(f"  [content] generated {len(body)} chars")
    except Exception as e:
        print(f"  [content] generation failed: {e}")
        await create_proof_post(
            product_id=product["id"],
            post_type=post_type,
            topic=topic["name"],
            generated_body="",
            generated_assets=assets,
            target_platforms=config.get("target_platforms", []),
            status="failed",
            error_message=str(e),
        )
        # Still push an alert on failure
        if product.get("telegramChatId"):
            await send_telegram(
                http,
                product["telegramChatId"],
                f"⚠️ *{product_name}* proof post generation failed\n"
                f"Type: {post_type}\nTopic: {topic['name']}\n\nError: {e}",
            )
        return

    # ── Save + notify ─────────────────────────────────────────────────────────
    post_id = await create_proof_post(
        product_id=product["id"],
        post_type=post_type,
        topic=topic["name"],
        generated_body=body,
        generated_assets=assets,
        target_platforms=config.get("target_platforms", []),
    )
    print(f"  [content] saved ProofPost {post_id[:8]}")

    if product.get("telegramChatId"):
        msg = format_proof_post_message(
            product_name=product_name,
            post_type=post_type,
            topic=topic["name"],
            body=body,
            pdf_url=pdf_url,
        )
        ok = await send_telegram(http, product["telegramChatId"], msg)
        print(f"  [content] telegram: {'sent' if ok else 'skipped/failed'}")
    else:
        print(f"  [content] no chat_id — telegram skipped")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--product-slug", default=None, help="Run for one product only")
    parser.add_argument("--post-type", default=None, help="Force a specific post type")
    args = parser.parse_args()

    start = time.time()
    print(f"[content] LaunchForge Content Flywheel starting…")
    print(f"[content] {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("[content] GROQ_API_KEY not set — exiting")
        return

    products = await get_active_products()
    if args.product_slug:
        products = [p for p in products if p["slug"] == args.product_slug]
    print(f"[content] found {len(products)} active product(s)")

    if not products:
        await close_pool()
        return

    has_permitai = bool(os.environ.get("PERMITAI_AUTH_TOKEN"))
    print(f"[content] PermitAI PDF generation: {'enabled' if has_permitai else 'disabled (no token)'}")

    llm = AsyncGroq(api_key=api_key)
    async with httpx.AsyncClient() as http:
        for product in products:
            try:
                await process_product(llm, http, product, post_type_override=args.post_type)
            except Exception as e:
                print(f"[content] ERROR processing {product.get('slug')}: {e}")

    await close_pool()

    elapsed = time.time() - start
    print(f"\n[content] done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
