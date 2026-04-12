"""Database operations for the CRM enrichment worker."""

import json
import os
import asyncpg

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        dsn = os.environ["DATABASE_URL"]
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=3)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_new_leads(limit: int = 100) -> list[dict]:
    """Fetch leads with status='new' that haven't been enriched yet."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, "productId", name, email, company, city, state,
               "enrichmentJson", source
        FROM "Lead"
        WHERE status = 'new'
        ORDER BY "createdAt" ASC
        LIMIT $1
        """,
        limit,
    )
    return [dict(r) for r in rows]


async def save_enrichment(
    lead_id: str,
    enrichment: dict,
    email: str | None = None,
    mark_enriched: bool = True,
) -> None:
    """Merge enrichment data into the lead's enrichmentJson and bump status."""
    pool = await get_pool()

    # Fetch current enrichment to merge
    row = await pool.fetchrow(
        'SELECT "enrichmentJson" FROM "Lead" WHERE id = $1',
        lead_id,
    )
    current_raw = row["enrichmentJson"] if row else "{}"
    if isinstance(current_raw, str):
        current = json.loads(current_raw or "{}")
    elif isinstance(current_raw, dict):
        current = dict(current_raw)
    else:
        current = {}

    merged = {**current, **enrichment}

    new_status = "enriched" if mark_enriched else None

    if email and new_status:
        await pool.execute(
            """
            UPDATE "Lead"
            SET "enrichmentJson" = $1::jsonb,
                email = COALESCE(email, $2),
                status = $3
            WHERE id = $4
            """,
            json.dumps(merged),
            email,
            new_status,
            lead_id,
        )
    elif new_status:
        await pool.execute(
            """
            UPDATE "Lead"
            SET "enrichmentJson" = $1::jsonb,
                status = $2
            WHERE id = $3
            """,
            json.dumps(merged),
            new_status,
            lead_id,
        )
    else:
        await pool.execute(
            """
            UPDATE "Lead"
            SET "enrichmentJson" = $1::jsonb
            WHERE id = $2
            """,
            json.dumps(merged),
            lead_id,
        )
