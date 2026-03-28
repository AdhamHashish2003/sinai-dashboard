/**
 * TikTok API integration stub.
 *
 * Required env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
 * Docs: https://developers.tiktok.com/doc/research-api-get-user-info
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

export interface TikTokVideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Fetch TikTok user profile.
 * TODO: Replace mock with real TikTok Research API call.
 */
export async function fetchTikTokProfile(username: string): Promise<TikTokProfile> {
  // TODO: Implement using TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET
  return {
    username,
    displayName: username,
    followerCount: 0,
    followingCount: 0,
    videoCount: 0,
    likesCount: 0,
    avatarUrl: `https://picsum.photos/seed/tt-${username}/96/96`,
    bio: "",
  };
}

/**
 * Fetch recent video metrics.
 * TODO: Replace with real API call.
 */
export async function fetchTikTokVideoMetrics(_username: string): Promise<TikTokVideoMetrics> {
  // TODO: Implement real API call
  return { views: 0, likes: 0, comments: 0, shares: 0 };
}
