/**
 * TikTok integration stub.
 *
 * No free public API available without OAuth app approval.
 * For now this always returns null — the refresh engine falls back to mock data.
 *
 * When TikTok Research API access is granted, implement here using
 * TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET.
 */

export interface TikTokProfile {
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  likesCount: number;
  avatarUrl: string;
  bio: string;
}

/**
 * Fetch TikTok user profile.
 * Returns null — no free API available yet.
 */
export async function fetchTikTokProfile(_username: string): Promise<TikTokProfile | null> {
  // TikTok Research API requires approved application
  // When available, implement here
  return null;
}
