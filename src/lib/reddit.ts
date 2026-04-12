/**
 * Reddit public JSON API helper — no OAuth, read-only.
 * Mirrors the Python workers/radar/scrape.py logic in TypeScript for inline API
 * route usage.
 */

const USER_AGENT =
  "LaunchForge-Radar/1.0 (inline; +https://github.com/AdhamHashish2003/sinai-dashboard)";

export interface RedditPost {
  source: "reddit";
  source_url: string;
  title: string;
  body: string;
  author: string;
  created_utc: number;
}

export async function fetchSubredditNew(
  subreddit: string,
  limit = 25
): Promise<RedditPost[]> {
  const sub = subreddit.replace(/^r\//, "").trim();
  if (!sub) return [];

  const url = `https://www.reddit.com/r/${sub}/new.json?limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[reddit] /r/${sub} ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: RedditRawPost }> };
    };

    const children = data.data?.children ?? [];
    return children
      .map((c) => c.data)
      .filter((d): d is RedditRawPost => !!d && !!d.title)
      .map((d) => ({
        source: "reddit" as const,
        source_url: `https://reddit.com${d.permalink ?? ""}`,
        title: d.title.trim(),
        body: (d.selftext ?? "").trim().slice(0, 3000),
        author: d.author ?? "[deleted]",
        created_utc: d.created_utc ?? 0,
      }));
  } catch (err) {
    console.warn(`[reddit] /r/${sub} error:`, err instanceof Error ? err.message : err);
    return [];
  }
}

interface RedditRawPost {
  title: string;
  selftext?: string;
  permalink?: string;
  author?: string;
  created_utc?: number;
}

export function filterLast24h(posts: RedditPost[]): RedditPost[] {
  const cutoff = Math.floor(Date.now() / 1000) - 86_400;
  return posts.filter((p) => p.created_utc >= cutoff);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
