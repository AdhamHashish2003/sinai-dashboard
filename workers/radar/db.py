"""Database operations for the Radar worker."""

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
    """Fetch all products with status='active'."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, slug, name, "targetKeywords", "targetSubreddits",
               "valueProp", icp, "anthropicKey"
        FROM "Product"
        WHERE status = 'active'
        """
    )
    return [dict(r) for r in rows]


async def get_existing_urls(product_id: str) -> set[str]:
    """Return all source_url values already saved for a product."""
    pool = await get_pool()
    rows = await pool.fetch(
        'SELECT "sourceUrl" FROM "Signal" WHERE "productId" = $1',
        product_id,
    )
    return {r["sourceUrl"] for r in rows}


async def save_signals(product_id: str, signals: list[dict]) -> int:
    """Insert signals in a transaction. Returns count inserted."""
    if not signals:
        return 0

    pool = await get_pool()
    inserted = 0

    async with pool.acquire() as conn:
        async with conn.transaction():
            for s in signals:
                try:
                    await conn.execute(
                        """
                        INSERT INTO "Signal"
                            (id, "productId", source, "sourceUrl", title, body,
                             author, score, reason, status, "createdAt")
                        VALUES
                            (gen_random_uuid()::text, $1, $2, $3, $4, $5,
                             $6, $7, $8, 'new', now())
                        ON CONFLICT ("productId", "sourceUrl") DO NOTHING
                        """,
                        product_id,
                        s["source"],
                        s["source_url"],
                        s["title"],
                        s["body"][:4000],  # cap body length
                        s["author"],
                        s["score"],
                        s["reason"],
                    )
                    inserted += 1
                except Exception as e:
                    print(f"  [db] skip insert: {e}")

    return inserted
