"""
LaunchForge Metrics Digest Worker
==================================
Compiles a compact cross-module digest per active product and sends it
to the product's telegramChatId.

Two modes:
  daily   — 24h window, sent at 8am PT (default)
  weekly  — trailing 7 days with week-over-week deltas, sent Monday 8am PT

Usage:
  python digest.py                  # daily mode (default)
  python digest.py --mode weekly    # weekly mode
  python digest.py --product-slug permit-ai --mode daily  # one product only

Env: DATABASE_URL, TELEGRAM_BOT_TOKEN, DASHBOARD_URL (optional, for link)
Cron: daily  0 15 * * *   (= 8am PDT / 7am PST)
      weekly 0 15 * * 1   (= Monday 8am PDT / 7am PST)
"""

import argparse
import asyncio
import datetime as dt
import os
import time

import asyncpg
import httpx

from telegram import send_telegram

DASHBOARD_URL = os.environ.get(
    "DASHBOARD_URL",
    "https://sinai-dashboard-production.up.railway.app",
).rstrip("/")

# Keep the message under Telegram's readable limit — 40 lines max per spec.
MAX_LINES = 40


# ── DB helpers ───────────────────────────────────────────────────────────────


async def get_active_products(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        'SELECT id, slug, name, "telegramChatId" FROM "Product" WHERE status = \'active\''
    )
    return [dict(r) for r in rows]


async def collect_metrics(
    pool: asyncpg.Pool,
    product_id: str,
    since: dt.datetime,
) -> dict:
    """Run all aggregation queries for one product + time window."""

    # Radar: signals found, avg score, top subreddit
    radar_row = await pool.fetchrow(
        """
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE score >= 9)::int AS high_intent,
          AVG(score)::float AS avg_score
        FROM "Signal"
        WHERE "productId" = $1 AND "createdAt" >= $2
        """,
        product_id,
        since,
    )

    top_sub_row = await pool.fetchrow(
        """
        SELECT substring("sourceUrl" from 'reddit\\.com/r/([^/]+)/') AS sub,
               COUNT(*)::int AS count
        FROM "Signal"
        WHERE "productId" = $1
          AND "createdAt" >= $2
          AND "source" = 'reddit'
          AND substring("sourceUrl" from 'reddit\\.com/r/([^/]+)/') IS NOT NULL
        GROUP BY sub
        ORDER BY count DESC
        LIMIT 1
        """,
        product_id,
        since,
    )

    # Swarm: drafts, posted
    swarm_row = await pool.fetchrow(
        """
        SELECT
          COUNT(*)::int AS drafted,
          COUNT(*) FILTER (WHERE status = 'posted')::int AS posted,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE status = 'ready_to_post')::int AS ready
        FROM "Reply"
        WHERE "productId" = $1 AND "createdAt" >= $2
        """,
        product_id,
        since,
    )

    # CRM: leads added, by status
    crm_row = await pool.fetchrow(
        """
        SELECT
          COUNT(*)::int AS added,
          COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted,
          COUNT(*) FILTER (WHERE status = 'replied')::int AS replied,
          COUNT(*) FILTER (WHERE status IN ('trial', 'paid'))::int AS converted
        FROM "Lead"
        WHERE "productId" = $1 AND "createdAt" >= $2
        """,
        product_id,
        since,
    )

    total_leads_row = await pool.fetchrow(
        'SELECT COUNT(*)::int AS total FROM "Lead" WHERE "productId" = $1',
        product_id,
    )

    # Content: posts generated, posted
    content_row = await pool.fetchrow(
        """
        SELECT
          COUNT(*)::int AS generated,
          COUNT(*) FILTER (WHERE status = 'posted')::int AS posted,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
        FROM "ProofPost"
        WHERE "productId" = $1 AND "createdAt" >= $2
        """,
        product_id,
        since,
    )

    # Action items (not windowed — these are current state)
    high_intent_pending = await pool.fetchval(
        """
        SELECT COUNT(*)::int FROM "Signal"
        WHERE "productId" = $1 AND score >= 9 AND status = 'new'
        """,
        product_id,
    )

    stale_contacted = await pool.fetchval(
        """
        SELECT COUNT(*)::int FROM "Lead"
        WHERE "productId" = $1
          AND status = 'contacted'
          AND ("lastTouchAt" IS NULL OR "lastTouchAt" < now() - interval '7 days')
        """,
        product_id,
    )

    unapproved_drafts = await pool.fetchval(
        """
        SELECT COUNT(*)::int FROM "ProofPost"
        WHERE "productId" = $1
          AND status = 'draft'
          AND "generatedBody" <> ''
          AND "createdAt" < now() - interval '24 hours'
        """,
        product_id,
    )

    return {
        "radar": {
            "total": radar_row["total"] or 0,
            "high_intent": radar_row["high_intent"] or 0,
            "avg_score": radar_row["avg_score"] or 0,
            "top_sub": top_sub_row["sub"] if top_sub_row else None,
            "top_sub_count": top_sub_row["count"] if top_sub_row else 0,
        },
        "swarm": {
            "drafted": swarm_row["drafted"] or 0,
            "posted": swarm_row["posted"] or 0,
            "rejected": swarm_row["rejected"] or 0,
            "ready": swarm_row["ready"] or 0,
        },
        "crm": {
            "added": crm_row["added"] or 0,
            "contacted": crm_row["contacted"] or 0,
            "replied": crm_row["replied"] or 0,
            "converted": crm_row["converted"] or 0,
            "total": total_leads_row["total"] or 0,
        },
        "content": {
            "generated": content_row["generated"] or 0,
            "posted": content_row["posted"] or 0,
            "approved": content_row["approved"] or 0,
        },
        "actions": {
            "high_intent_pending": high_intent_pending or 0,
            "stale_contacted": stale_contacted or 0,
            "unapproved_drafts": unapproved_drafts or 0,
        },
    }


# ── Message formatting ──────────────────────────────────────────────────────


def fmt_delta(current: int, prev: int) -> str:
    """Return a '↑12%' / '↓3%' / '—' delta string, log-ish for small numbers."""
    if prev == 0 and current == 0:
        return "—"
    if prev == 0:
        return "new"
    diff = current - prev
    if diff == 0:
        return "="
    pct = (diff / prev) * 100
    arrow = "↑" if diff > 0 else "↓"
    return f"{arrow}{abs(round(pct))}%"


def build_action_items(actions: dict) -> list[str]:
    """Priority order: high-intent > stale leads > unapproved drafts. Max 3."""
    items: list[tuple[int, str]] = []
    hi = actions["high_intent_pending"]
    sc = actions["stale_contacted"]
    ud = actions["unapproved_drafts"]

    if hi > 0:
        items.append(
            (1, f"⚡ {hi} high-intent signal{'s' if hi != 1 else ''} (9-10) awaiting reply")
        )
    if sc > 0:
        items.append(
            (2, f"⚡ {sc} lead{'s' if sc != 1 else ''} stuck in 'contacted' >7d")
        )
    if ud > 0:
        items.append(
            (3, f"⚡ {ud} content draft{'s' if ud != 1 else ''} awaiting approval >24h")
        )

    items.sort(key=lambda x: x[0])
    return [text for _, text in items[:3]]


def build_daily_message(
    product_name: str,
    metrics: dict,
    period_label: str,
) -> str:
    r = metrics["radar"]
    s = metrics["swarm"]
    c = metrics["crm"]
    p = metrics["content"]

    lines = [
        f"📊 {product_name} — {period_label}",
        "",
        "RADAR",
        f"  Signals found: {r['total']}  (9-10: {r['high_intent']})",
        f"  Avg intent score: {r['avg_score']:.1f}",
    ]
    if r["top_sub"]:
        lines.append(f"  Top sub: /r/{r['top_sub']} ({r['top_sub_count']})")

    lines += [
        "",
        "SWARM",
        f"  Drafted: {s['drafted']}  Posted: {s['posted']}  Rejected: {s['rejected']}  Ready: {s['ready']}",
    ]

    lines += [
        "",
        "CRM",
        f"  New leads: {c['added']}  Contacted: {c['contacted']}  Replied: {c['replied']}",
        f"  Converted (trial/paid): {c['converted']}  | Total lifetime: {c['total']}",
    ]

    lines += [
        "",
        "CONTENT",
        f"  Generated: {p['generated']}  Approved: {p['approved']}  Posted: {p['posted']}",
    ]

    actions = build_action_items(metrics["actions"])
    if actions:
        lines += ["", "ACTION ITEMS"]
        lines += [f"  {item}" for item in actions]

    lines += ["", f"→ {DASHBOARD_URL}/dashboard/metrics"]

    return "\n".join(lines[:MAX_LINES])


def build_weekly_message(
    product_name: str,
    current: dict,
    previous: dict,
) -> str:
    r = current["radar"]
    s = current["swarm"]
    c = current["crm"]
    p = current["content"]
    pr = previous["radar"]
    ps = previous["swarm"]
    pc = previous["crm"]
    pp = previous["content"]

    lines = [
        f"📈 {product_name} — weekly digest (last 7d vs prior 7d)",
        "",
        "RADAR",
        f"  Signals: {r['total']}  {fmt_delta(r['total'], pr['total'])}",
        f"  High-intent (9-10): {r['high_intent']}  {fmt_delta(r['high_intent'], pr['high_intent'])}",
        "",
        "SWARM",
        f"  Drafted: {s['drafted']}  {fmt_delta(s['drafted'], ps['drafted'])}",
        f"  Posted: {s['posted']}  {fmt_delta(s['posted'], ps['posted'])}",
        "",
        "CRM",
        f"  New leads: {c['added']}  {fmt_delta(c['added'], pc['added'])}",
        f"  Converted: {c['converted']}  {fmt_delta(c['converted'], pc['converted'])}",
        "",
        "CONTENT",
        f"  Generated: {p['generated']}  {fmt_delta(p['generated'], pp['generated'])}",
        f"  Posted: {p['posted']}  {fmt_delta(p['posted'], pp['posted'])}",
    ]

    actions = build_action_items(current["actions"])
    if actions:
        lines += ["", "ACTION ITEMS"]
        lines += [f"  {item}" for item in actions]

    lines += ["", f"→ {DASHBOARD_URL}/dashboard/metrics?period=7d"]

    return "\n".join(lines[:MAX_LINES])


def all_zero(metrics: dict) -> bool:
    """Skip digest if there's literally no activity in the window."""
    return (
        metrics["radar"]["total"] == 0
        and metrics["swarm"]["drafted"] == 0
        and metrics["crm"]["added"] == 0
        and metrics["content"]["generated"] == 0
        and metrics["actions"]["high_intent_pending"] == 0
        and metrics["actions"]["stale_contacted"] == 0
        and metrics["actions"]["unapproved_drafts"] == 0
    )


# ── Main ─────────────────────────────────────────────────────────────────────


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["daily", "weekly"], default="daily")
    parser.add_argument("--product-slug", default=None)
    args = parser.parse_args()

    start = time.time()
    mode = args.mode
    print(f"[digest] mode={mode}")
    print(f"[digest] {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    now = dt.datetime.now(dt.timezone.utc)
    if mode == "daily":
        since = now - dt.timedelta(hours=24)
        period_label = "last 24h"
    else:
        since = now - dt.timedelta(days=7)
        period_label = "last 7d"

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("[digest] DATABASE_URL not set — exiting")
        return

    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=3)
    try:
        products = await get_active_products(pool)
        if args.product_slug:
            products = [p for p in products if p["slug"] == args.product_slug]
        print(f"[digest] {len(products)} active product(s)")

        async with httpx.AsyncClient() as http:
            for product in products:
                print(f"\n[digest] {product['slug']}")

                current = await collect_metrics(pool, product["id"], since)

                if mode == "weekly":
                    prev_since = since - dt.timedelta(days=7)
                    prev_end = since
                    # Second query for the prior window uses the same function
                    # but we need a different "since". Quick hack: rerun with
                    # prev_since and subtract rows from the current window.
                    # Simpler: just query the prior window directly by passing
                    # prev_since and capping via a helper. For now we approximate
                    # by running collect_metrics(prev_since) and subtracting.
                    total_prev = await collect_metrics(pool, product["id"], prev_since)

                    # "previous" = prior-7d total minus current-7d total
                    previous = {
                        "radar": {
                            "total": total_prev["radar"]["total"] - current["radar"]["total"],
                            "high_intent": total_prev["radar"]["high_intent"] - current["radar"]["high_intent"],
                            "avg_score": total_prev["radar"]["avg_score"],
                            "top_sub": total_prev["radar"]["top_sub"],
                            "top_sub_count": total_prev["radar"]["top_sub_count"],
                        },
                        "swarm": {
                            "drafted": total_prev["swarm"]["drafted"] - current["swarm"]["drafted"],
                            "posted": total_prev["swarm"]["posted"] - current["swarm"]["posted"],
                            "rejected": total_prev["swarm"]["rejected"] - current["swarm"]["rejected"],
                            "ready": total_prev["swarm"]["ready"] - current["swarm"]["ready"],
                        },
                        "crm": {
                            "added": total_prev["crm"]["added"] - current["crm"]["added"],
                            "contacted": total_prev["crm"]["contacted"] - current["crm"]["contacted"],
                            "replied": total_prev["crm"]["replied"] - current["crm"]["replied"],
                            "converted": total_prev["crm"]["converted"] - current["crm"]["converted"],
                            "total": total_prev["crm"]["total"],
                        },
                        "content": {
                            "generated": total_prev["content"]["generated"] - current["content"]["generated"],
                            "posted": total_prev["content"]["posted"] - current["content"]["posted"],
                            "approved": total_prev["content"]["approved"] - current["content"]["approved"],
                        },
                    }

                if all_zero(current):
                    print(f"  [digest] no activity — skipping")
                    continue

                if mode == "weekly":
                    message = build_weekly_message(product["name"], current, previous)  # type: ignore[arg-type]
                else:
                    message = build_daily_message(product["name"], current, period_label)

                print(f"  [digest] message ({len(message.splitlines())} lines):")
                for line in message.splitlines()[:8]:
                    print(f"    {line}")
                print("    ...")

                chat_id = product.get("telegramChatId")
                if chat_id:
                    ok = await send_telegram(http, chat_id, message)
                    print(f"  [digest] telegram: {'sent' if ok else 'skipped/failed'}")
                else:
                    print(f"  [digest] no chat_id — skipped")
    finally:
        await pool.close()

    elapsed = time.time() - start
    print(f"\n[digest] done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
