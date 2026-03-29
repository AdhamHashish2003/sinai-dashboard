import { PrismaClient } from "@prisma/client";
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

const globalForDb = globalThis as unknown as { refreshDb: PrismaClient | undefined };
const db = globalForDb.refreshDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForDb.refreshDb = db;

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


/**
 * Fetch data for a single connection.
 * Uses real APIs when available; skips if API is unavailable (no fake data).
 */
export async function fetchConnectionData(connection: ConnectionRow): Promise<void> {
  if (connection.type === "social") {
    const realData = await fetchRealSocialData(connection);

    if (!realData) {
      // No API data available — skip, don't generate fake numbers
      console.log(`[refresh-engine] No API data for ${connection.platform}/${connection.username}, skipping`);
      return;
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
  } else if (connection.type === "web") {
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
  }
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
