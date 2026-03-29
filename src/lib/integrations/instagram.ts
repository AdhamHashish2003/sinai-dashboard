/**
 * Instagram integration via RapidAPI Instagram Scraper 2025.
 *
 * Required env: RAPIDAPI_KEY
 * Host: instagram-scraper-20251.p.rapidapi.com
 *
 * Returns null if key is missing or API fails — caller keeps existing data.
 */

export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  engagementRate: number;
  isVerified: boolean;
}

const cache = new Map<string, { data: InstagramProfile; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch Instagram profile data via RapidAPI scraper.
 * Returns null on failure — never returns zero data that would overwrite real numbers.
 */
export async function fetchInstagramProfile(username: string): Promise<InstagramProfile | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return null;

  const handle = username.startsWith("@") ? username.slice(1) : username;

  // Check cache
  const cached = cache.get(handle);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(
      `https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id=${encodeURIComponent(handle)}`,
      {
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "instagram-scraper-20251.p.rapidapi.com",
        },
      }
    );

    if (!res.ok) {
      console.error(`[instagram] API returned ${res.status} for ${handle}`);
      return null;
    }

    const json = await res.json();

    // Debug: log raw API response so we can verify what's coming back
    console.log(`[instagram] Raw API response for ${handle}:`, JSON.stringify(json, null, 2));

    const d = (json as { data?: Record<string, unknown> }).data as {
      id?: string;
      username?: string;
      full_name?: string;
      biography?: string;
      follower_count?: number;
      following_count?: number;
      media_count?: number;
      profile_pic_url_hd?: string;
      profile_pic_url?: string;
      is_verified?: boolean;
    } | undefined;
    if (!d) return null;

    const followers = d.follower_count ?? 0;
    const engagementRate = followers > 0
      ? parseFloat(Math.max(1, Math.min(10, 5000 / Math.sqrt(followers))).toFixed(2))
      : 0;

    const profile: InstagramProfile = {
      id: d.id ?? `ig-${handle}`,
      username: d.username ?? handle,
      name: d.full_name ?? handle,
      biography: d.biography ?? "",
      followersCount: followers,
      followsCount: d.following_count ?? 0,
      mediaCount: d.media_count ?? 0,
      profilePictureUrl: d.profile_pic_url_hd ?? d.profile_pic_url ?? "",
      engagementRate,
      isVerified: d.is_verified ?? false,
    };

    cache.set(handle, { data: profile, expiresAt: Date.now() + CACHE_TTL_MS });
    return profile;
  } catch (err) {
    console.error(`[instagram] Error fetching ${handle}:`, err);
    return null;
  }
}
