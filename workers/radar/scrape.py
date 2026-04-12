"""Reddit and Hacker News scrapers for the Radar worker."""

import asyncio
import time
import httpx

REDDIT_HEADERS = {
    "User-Agent": "LaunchForge-Radar/1.0 (radar worker; async; +https://github.com/AdhamHashish2003/sinai-dashboard)"
}

HN_BASE = "https://hn.algolia.com/api/v1"

# ── Reddit ────────────────────────────────────────────────────────────────────


async def scrape_reddit(
    client: httpx.AsyncClient,
    subreddits: list[str],
    max_per_sub: int = 50,
) -> list[dict]:
    """Fetch /new.json for each subreddit, filter to last 24h."""
    cutoff = time.time() - 86_400  # 24 hours ago
    posts: list[dict] = []

    for raw_sub in subreddits:
        sub = raw_sub.lstrip("r/").strip()
        if not sub:
            continue

        url = f"https://www.reddit.com/r/{sub}/new.json?limit={max_per_sub}"
        print(f"  [reddit] fetching /r/{sub}/new.json")

        try:
            resp = await client.get(url, headers=REDDIT_HEADERS, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"  [reddit] error fetching /r/{sub}: {e}")
            await asyncio.sleep(2)
            continue

        children = data.get("data", {}).get("children", [])
        for child in children:
            d = child.get("data", {})
            created = d.get("created_utc", 0)
            if created < cutoff:
                continue

            title = d.get("title", "").strip()
            body = d.get("selftext", "").strip()
            # Skip image-only / link-only posts with no text
            if not title:
                continue

            posts.append(
                {
                    "source": "reddit",
                    "source_url": f"https://reddit.com{d.get('permalink', '')}",
                    "title": title,
                    "body": body[:3000],
                    "author": d.get("author", "[deleted]"),
                }
            )

        print(f"  [reddit] /r/{sub}: {len(children)} raw → {sum(1 for p in posts if f'/r/{sub}/' in p['source_url'] or True)} after 24h filter")

        # Rate limit: 2 second delay between subreddit requests
        await asyncio.sleep(2)

    return posts


# ── Hacker News ───────────────────────────────────────────────────────────────


async def scrape_hn(
    client: httpx.AsyncClient,
    keywords: list[str],
    max_per_keyword: int = 30,
) -> list[dict]:
    """Search HN Algolia API for recent stories + comments matching keywords."""
    cutoff = int(time.time()) - 86_400
    posts: list[dict] = []
    seen_urls: set[str] = set()

    for kw in keywords:
        if not kw.strip():
            continue

        for tag in ("story", "comment"):
            url = (
                f"{HN_BASE}/search_recent"
                f"?query={kw}"
                f"&tags={tag}"
                f"&numericFilters=created_at_i>{cutoff}"
                f"&hitsPerPage={max_per_keyword}"
            )
            print(f"  [hn] searching '{kw}' ({tag})")

            try:
                resp = await client.get(url, timeout=15)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                print(f"  [hn] error searching '{kw}' ({tag}): {e}")
                continue

            for hit in data.get("hits", []):
                object_id = hit.get("objectID", "")
                if tag == "story":
                    source_url = hit.get("url") or f"https://news.ycombinator.com/item?id={object_id}"
                else:
                    source_url = f"https://news.ycombinator.com/item?id={object_id}"

                if source_url in seen_urls:
                    continue
                seen_urls.add(source_url)

                title = hit.get("title") or hit.get("story_title") or ""
                body = hit.get("comment_text") or hit.get("story_text") or ""
                author = hit.get("author", "unknown")

                posts.append(
                    {
                        "source": "hackernews",
                        "source_url": source_url,
                        "title": title.strip(),
                        "body": body.strip()[:3000],
                        "author": author,
                    }
                )

            print(f"  [hn] '{kw}' ({tag}): {len(data.get('hits', []))} hits")

        # Small delay between keyword searches
        await asyncio.sleep(1)

    return posts
