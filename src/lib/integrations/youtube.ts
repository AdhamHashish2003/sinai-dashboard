/**
 * YouTube Data API v3 integration.
 *
 * Required env: GOOGLE_API_KEY
 * Docs: https://developers.google.com/youtube/v3/docs/channels
 *
 * Returns null if key is missing — caller falls back to mock data.
 */

export interface YouTubeChannelData {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

const cache = new Map<string, { data: YouTubeChannelData; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch YouTube channel stats by username or handle.
 * Tries forHandle first, then forUsername as fallback.
 */
export async function fetchYouTubeChannel(username: string): Promise<YouTubeChannelData | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  // Check cache
  const cached = cache.get(username);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const handle = username.startsWith("@") ? username.slice(1) : username;

  try {
    // Try forHandle first (modern YouTube handles)
    let data = await tryFetch(apiKey, `forHandle=${encodeURIComponent(handle)}`);
    if (!data) {
      // Fallback: try forUsername (legacy usernames)
      data = await tryFetch(apiKey, `forUsername=${encodeURIComponent(handle)}`);
    }
    if (!data) {
      // Fallback: try as channel ID directly
      data = await tryFetch(apiKey, `id=${encodeURIComponent(username)}`);
    }
    if (data) {
      cache.set(username, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return data;
  } catch (err) {
    console.error(`[youtube] Error fetching ${username}:`, err);
    return null;
  }
}

async function tryFetch(apiKey: string, query: string): Promise<YouTubeChannelData | null> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${query}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json() as {
    items?: Array<{
      id: string;
      snippet: { title: string; description: string; thumbnails: { default: { url: string } } };
      statistics: { subscriberCount: string; videoCount: string; viewCount: string };
    }>;
  };

  const item = json.items?.[0];
  if (!item) return null;

  return {
    channelId: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.default.url,
    subscriberCount: parseInt(item.statistics.subscriberCount, 10) || 0,
    videoCount: parseInt(item.statistics.videoCount, 10) || 0,
    viewCount: parseInt(item.statistics.viewCount, 10) || 0,
  };
}
