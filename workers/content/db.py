"""Database operations for the Content Flywheel worker."""

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


async def get_active_products() -> list[dict]:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, slug, name, tagline, "valueProp", icp,
               "freeTierHook", "prodUrl", "groqKey", "telegramChatId"
        FROM "Product"
        WHERE status IN ('active', 'launched')
        ORDER BY "createdAt" ASC
        """
    )
    return [dict(r) for r in rows]


async def already_posted_today(product_id: str, post_type: str) -> bool:
    """Check if a post of this type was already generated for this product today."""
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        SELECT id FROM "ProofPost"
        WHERE "productId" = $1
          AND "postType" = $2
          AND "createdAt" >= date_trunc('day', now())
        LIMIT 1
        """,
        product_id,
        post_type,
    )
    return row is not None


async def cities_used_in_last_30d(product_id: str) -> set[str]:
    """Return topic (city name) values used for this product in the last 30 days."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT topic FROM "ProofPost"
        WHERE "productId" = $1
          AND "createdAt" >= now() - interval '30 days'
        """,
        product_id,
    )
    return {r["topic"] for r in rows if r["topic"]}


async def create_proof_post(
    product_id: str,
    post_type: str,
    topic: str,
    generated_body: str,
    generated_assets: list,
    target_platforms: list,
    status: str = "draft",
    error_message: str | None = None,
) -> str:
    """Insert a ProofPost row and return its id."""
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO "ProofPost"
            (id, "productId", "postType", topic, "generatedBody",
             "generatedAssets", "targetPlatforms", "draftVersions",
             status, "errorMessage", "createdAt")
        VALUES
            (gen_random_uuid()::text, $1, $2, $3, $4,
             $5::jsonb, $6::jsonb, $7::jsonb,
             $8, $9, now())
        RETURNING id
        """,
        product_id,
        post_type,
        topic,
        generated_body,
        json.dumps(generated_assets),
        json.dumps(target_platforms),
        json.dumps([{"body": generated_body}]),
        status,
        error_message,
    )
    return row["id"]
