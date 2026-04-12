"""Database operations for the Swarm worker."""

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


async def get_pending_drafts(limit: int = 20) -> list[dict]:
    """Fetch Reply rows with status='pending_draft', joined with Signal + Product."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            r.id              AS reply_id,
            r."draftVersions" AS draft_versions,
            r.notes           AS reply_notes,
            s.id              AS signal_id,
            s.title           AS signal_title,
            s.body            AS signal_body,
            s.author          AS signal_author,
            s.source          AS signal_source,
            s."sourceUrl"     AS signal_source_url,
            s.score           AS signal_score,
            s.reason          AS signal_reason,
            p.id              AS product_id,
            p.name            AS product_name,
            p."valueProp"     AS product_value_prop,
            p.icp             AS product_icp,
            p."freeTierHook"  AS product_free_tier_hook,
            p."prodUrl"       AS product_prod_url,
            p."anthropicKey"  AS product_anthropic_key,
            p."telegramChatId" AS product_telegram_chat_id
        FROM "Reply" r
        JOIN "Signal" s  ON r."signalId"  = s.id
        JOIN "Product" p ON r."productId" = p.id
        WHERE r.status = 'pending_draft'
        ORDER BY r."createdAt" ASC
        LIMIT $1
        """,
        limit,
    )
    return [dict(r) for r in rows]


async def save_draft(
    reply_id: str,
    draft_body: str,
    existing_versions: list | str | None,
    regenerate_note: str | None = None,
) -> None:
    """Save a new draft: set draftBody, append to draftVersions, status → ready_to_post."""
    pool = await get_pool()

    # Parse existing versions (asyncpg may return JSONB as str or list)
    if isinstance(existing_versions, str):
        versions = json.loads(existing_versions or "[]")
    elif isinstance(existing_versions, list):
        versions = list(existing_versions)
    else:
        versions = []

    new_version = {
        "body": draft_body,
        "createdAt": None,  # Postgres will set on row update; placeholder
    }
    if regenerate_note:
        new_version["note"] = regenerate_note
    versions.append(new_version)

    await pool.execute(
        """
        UPDATE "Reply"
        SET "draftBody"     = $1,
            "draftVersions" = $2::jsonb,
            status          = 'ready_to_post'
        WHERE id = $3
        """,
        draft_body,
        json.dumps(versions),
        reply_id,
    )


async def mark_draft_failed(reply_id: str, error_msg: str) -> None:
    """If Claude call fails, leave status=pending_draft but record error note."""
    pool = await get_pool()
    await pool.execute(
        'UPDATE "Reply" SET notes = $1 WHERE id = $2',
        f"draft error: {error_msg}",
        reply_id,
    )
