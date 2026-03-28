/**
 * Instagram / Meta Graph API integration stub.
 *
 * Required env: INSTAGRAM_ACCESS_TOKEN
 * Docs: https://developers.facebook.com/docs/instagram-api
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
}

export interface InstagramMediaInsight {
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/**
 * Fetch Instagram business profile data.
 * TODO: Replace mock with real Meta Graph API call.
 * Endpoint: GET /{user-id}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url
 */
export async function fetchInstagramProfile(username: string): Promise<InstagramProfile> {
  // TODO: Implement real API call using process.env.INSTAGRAM_ACCESS_TOKEN
  return {
    id: `mock-ig-${username}`,
    username,
    name: username,
    biography: "",
    followersCount: 0,
    followsCount: 0,
    mediaCount: 0,
    profilePictureUrl: `https://picsum.photos/seed/ig-${username}/96/96`,
  };
}

/**
 * Fetch recent media insights for an Instagram account.
 * TODO: Replace with real API call.
 * Endpoint: GET /{user-id}/media?fields=id,timestamp,like_count,comments_count
 */
export async function fetchInstagramInsights(_username: string): Promise<InstagramMediaInsight> {
  // TODO: Implement real API call
  return { reach: 0, impressions: 0, engagement: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
}
