"""
LaunchForge CRM Enrichment Worker
=================================
Cron job (every 15 min) that picks leads with status='new' and tries to
enrich them with email + role data.

Feature flags (env vars):
  - HUNTER_API_KEY  — if set, uses Hunter.io Email Finder
  - APOLLO_API_KEY  — if set, uses Apollo.io People Enrichment (future)

If neither is set, marks enrichment_json.email_status = "cslb_only" and
moves the lead to status=enriched so it shows up as workable in the kanban.
This is best-effort — a failed enrichment NEVER blocks lead creation.

Run: python enrich.py
Env: DATABASE_URL (required), HUNTER_API_KEY/APOLLO_API_KEY (optional)
Cron: */15 * * * *
"""

import asyncio
import os
import time

import httpx

from db import get_new_leads, save_enrichment, close_pool


async def enrich_with_hunter(
    http: httpx.AsyncClient,
    lead: dict,
) -> tuple[str | None, dict]:
    """Try Hunter.io Email Finder. Returns (email, enrichment_update)."""
    key = os.environ.get("HUNTER_API_KEY")
    if not key or not lead.get("company"):
        return None, {}

    try:
        resp = await http.get(
            "https://api.hunter.io/v2/email-finder",
            params={
                "company": lead["company"],
                "full_name": lead["name"],
                "api_key": key,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return None, {"email_status": "hunter_no_match"}

        data = resp.json().get("data", {})
        email = data.get("email")
        if not email:
            return None, {"email_status": "hunter_no_match"}

        return email, {
            "email_status": "hunter_found",
            "hunter_confidence": data.get("score"),
            "hunter_sources": (data.get("sources") or [])[:3],
        }
    except Exception as e:
        print(f"  [hunter] error for {lead['id']}: {e}")
        return None, {"email_status": "hunter_error"}


async def enrich_with_apollo(
    http: httpx.AsyncClient,
    lead: dict,
) -> tuple[str | None, dict]:
    """Apollo.io placeholder — add logic here when we have an API key."""
    key = os.environ.get("APOLLO_API_KEY")
    if not key:
        return None, {}
    # Intentional stub: future implementation will call Apollo's
    # /v1/people/match endpoint. For now, no-op.
    return None, {"email_status": "apollo_not_implemented"}


async def enrich_lead(http: httpx.AsyncClient, lead: dict) -> None:
    """Run the enrichment pipeline on a single lead."""
    lead_id = lead["id"]
    name = lead["name"]
    print(f"\n[enrich] {lead_id[:8]} — {name}")

    # Already has an email? Just mark enriched and move on.
    if lead.get("email"):
        await save_enrichment(
            lead_id,
            {"email_status": "already_had_email"},
            email=None,
            mark_enriched=True,
        )
        print(f"  [enrich] already has email, marking enriched")
        return

    hunter_key = os.environ.get("HUNTER_API_KEY")
    apollo_key = os.environ.get("APOLLO_API_KEY")

    if hunter_key:
        email, update = await enrich_with_hunter(http, lead)
        if email:
            await save_enrichment(lead_id, update, email=email, mark_enriched=True)
            print(f"  [enrich] hunter found: {email}")
            return
        if update:
            # Hunter tried but didn't find — still mark enriched (move kanban forward)
            await save_enrichment(lead_id, update, mark_enriched=True)
            print(f"  [enrich] hunter: no match")
            return

    if apollo_key:
        email, update = await enrich_with_apollo(http, lead)
        if email:
            await save_enrichment(lead_id, update, email=email, mark_enriched=True)
            print(f"  [enrich] apollo found: {email}")
            return

    # No enrichment provider available — fall back to CSLB-only status
    await save_enrichment(
        lead_id,
        {"email_status": "cslb_only"},
        mark_enriched=True,
    )
    print(f"  [enrich] cslb_only (no enrichment provider configured)")


async def main() -> None:
    start = time.time()
    print(f"[enrich] LaunchForge CRM Enrichment Worker starting...")
    print(f"[enrich] {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    has_hunter = bool(os.environ.get("HUNTER_API_KEY"))
    has_apollo = bool(os.environ.get("APOLLO_API_KEY"))
    print(f"[enrich] providers: hunter={has_hunter} apollo={has_apollo}")

    leads = await get_new_leads(limit=100)
    print(f"[enrich] found {len(leads)} new lead(s) to enrich")

    if not leads:
        await close_pool()
        return

    async with httpx.AsyncClient() as http:
        for lead in leads:
            try:
                await enrich_lead(http, lead)
            except Exception as e:
                print(f"[enrich] error on {lead['id']}: {e}")
            # Gentle rate limit: 1s between lookups to avoid hammering Hunter
            await asyncio.sleep(1)

    await close_pool()

    elapsed = time.time() - start
    print(f"\n[enrich] done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
