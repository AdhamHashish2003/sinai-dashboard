import { db } from "./db";
import { fetchInstagramProfile } from "./integrations/instagram";
import { fetchYouTubeChannel } from "./integrations/youtube";
import { fetchTikTokProfile } from "./integrations/tiktok";

type ConnectionRow = {
  id: string;
  platform: string;
  username: string;
  type: string;
  status: string;
  dataSource: string;
  lastFetchedAt: Date | null;
  refreshIntervalMinutes: number;
};

/**
 * Try to fetch real data for a social connection.
 * Returns { data, source: "api" } on success, or null if API unavailable.
 */
async function fetchRealSocialData(connection: ConnectionRow): Promise<{
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avatarUrl?: string;
  bio?: string;
} | null> {
  const handle = connection.username.startsWith("@")
    ? connection.username.slice(1)
    : connection.username;

  switch (connection.platform) {
    case "instagram": {
      const profile = await fetchInstagramProfile(handle);
      if (!profile) return null;
      return {
        followers: profile.followersCount,
        following: profile.followsCount,
        posts: profile.mediaCount,
        engagementRate: profile.engagementRate,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        avatarUrl: profile.profilePictureUrl || undefined,
        bio: profile.biography || undefined,
      };
    }

    case "youtube": {
      const channel = await fetchYouTubeChannel(handle);
      if (!channel) return null;
      return {
        followers: channel.subscriberCount,
        following: 0,
        posts: channel.videoCount,
        engagementRate: 0,
        views: channel.viewCount,
        likes: 0,
        comments: 0,
        shares: 0,
        avatarUrl: channel.thumbnailUrl || undefined,
        bio: channel.description?.slice(0, 200) || undefined,
      };
    }

    case "tiktok": {
      const profile = await fetchTikTokProfile(handle);
      if (!profile) return null;
      return {
        followers: profile.followerCount,
        following: profile.followingCount,
        posts: profile.videoCount,
        engagementRate: 0,
        views: 0,
        likes: profile.likesCount,
        comments: 0,
        shares: 0,
        avatarUrl: profile.avatarUrl || undefined,
        bio: profile.bio || undefined,
      };
    }

    default:
      // twitter, linkedin — no free API yet
      return null;
  }
}


export type FetchResult =
  | { refreshed: true }
  | { refreshed: false; reason: string };

const SKIP_REASONS: Record<string, string> = {
  instagram: "Instagram API unavailable — set RAPIDAPI_KEY in env to enable live fetches.",
  youtube: "YouTube API unavailable — set GOOGLE_API_KEY in env to enable live fetches.",
  tiktok: "TikTok has no free public API — connection stays on manual data.",
  twitter: "Twitter/X has no free public API — connection stays on manual data.",
  linkedin: "LinkedIn has no free public API — connection stays on manual data.",
};

/**
 * Fetch data for a single connection.
 * Uses real APIs when available; returns { refreshed: false, reason } when
 * no data could be fetched so callers (UI, cron engine) can surface why.
 */
export async function fetchConnectionData(connection: ConnectionRow): Promise<FetchResult> {
  if (connection.type === "social") {
    const realData = await fetchRealSocialData(connection);

    if (!realData) {
      const reason =
        SKIP_REASONS[connection.platform] ??
        `No API integration available for ${connection.platform}.`;
      console.log(
        `[refresh-engine] Skipped ${connection.platform}/${connection.username}: ${reason}`
      );
      return { refreshed: false, reason };
    }

    await db.connectionMetric.create({
      data: {
        connectionId: connection.id,
        date: new Date(),
        followers: realData.followers,
        following: realData.following,
        posts: realData.posts,
        engagementRate: realData.engagementRate,
        views: realData.views,
        likes: realData.likes,
        comments: realData.comments,
        shares: realData.shares,
      },
    });

    const updateData: Record<string, unknown> = {
      lastFetchedAt: new Date(),
      status: "active",
      dataSource: "api",
    };
    if (realData.avatarUrl) updateData.avatarUrl = realData.avatarUrl;
    if (realData.bio) updateData.bio = realData.bio;

    await db.connection.update({
      where: { id: connection.id },
      data: updateData,
    });
    return { refreshed: true };
  }

  if (connection.type === "web") {
    const lastWeb = await db.webMetric.findFirst({
      where: { connectionId: connection.id },
      orderBy: { date: "desc" },
    });

    await db.webMetric.create({
      data: {
        connectionId: connection.id,
        date: new Date(),
        pageViews: lastWeb?.pageViews ?? 0,
        uniqueVisitors: lastWeb?.uniqueVisitors ?? 0,
        bounceRate: lastWeb?.bounceRate ?? 0,
        avgSessionDuration: lastWeb?.avgSessionDuration ?? 0,
        topPages: lastWeb?.topPages ?? [],
      },
    });

    await db.connection.update({
      where: { id: connection.id },
      data: { lastFetchedAt: new Date(), status: "active" },
    });
    return { refreshed: true };
  }

  return {
    refreshed: false,
    reason: `Unknown connection type: ${connection.type}`,
  };
}

/**
 * Run one refresh cycle: find all active connections due for refresh and fetch data.
 */
export async function runRefreshCycle(): Promise<void> {
  const now = new Date();

  const connections = await db.connection.findMany({
    where: { status: "active" },
  });

  for (const conn of connections) {
    const intervalMs = conn.refreshIntervalMinutes * 60 * 1000;
    const lastFetched = conn.lastFetchedAt?.getTime() ?? 0;

    if (now.getTime() - lastFetched >= intervalMs) {
      try {
        await fetchConnectionData(conn);
      } catch (err) {
        console.error(`[refresh-engine] Error fetching ${conn.platform}/${conn.username}:`, err);
        await db.connection.update({
          where: { id: conn.id },
          data: { status: "error" },
        }).catch(() => {});
      }
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the refresh engine loop. Call this from the socket.io server process.
 * Runs every 5 minutes and checks which connections are due.
 */
export function startRefreshEngine(): void {
  if (intervalId) return;

  runRefreshCycle().catch((err) =>
    console.error("[refresh-engine] Initial cycle error:", err)
  );

  intervalId = setInterval(() => {
    runRefreshCycle().catch((err) =>
      console.error("[refresh-engine] Cycle error:", err)
    );
  }, 5 * 60 * 1000);
}
