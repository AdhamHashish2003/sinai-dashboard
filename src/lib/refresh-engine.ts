import { PrismaClient } from "@prisma/client";

type ConnectionRow = {
  id: string;
  platform: string;
  username: string;
  type: string;
  status: string;
  lastFetchedAt: Date | null;
  refreshIntervalMinutes: number;
};

const globalForDb = globalThis as unknown as { refreshDb: PrismaClient | undefined };
const db = globalForDb.refreshDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForDb.refreshDb = db;

/**
 * Fetch data for a single connection.
 * Currently returns mock data — TODO: replace with real API calls per platform.
 */
export async function fetchConnectionData(connection: ConnectionRow): Promise<void> {
  // Get last known metric to generate realistic variations
  const lastMetric = await db.connectionMetric.findFirst({
    where: { connectionId: connection.id },
    orderBy: { date: "desc" },
  });

  const baseFollowers = lastMetric?.followers ?? 50_000;
  const jitter = (v: number, pct = 0.02) => Math.round(v * (1 + (Math.random() - 0.3) * pct));

  if (connection.type === "social") {
    // TODO: Replace with real API calls based on connection.platform
    // - instagram: Meta Graph API (needs INSTAGRAM_ACCESS_TOKEN)
    // - tiktok: TikTok API
    // - youtube: YouTube Data API v3
    // - twitter: Twitter API v2
    // - linkedin: LinkedIn API
    await db.connectionMetric.create({
      data: {
        connectionId: connection.id,
        date: new Date(),
        followers: jitter(baseFollowers),
        following: jitter(lastMetric?.following ?? Math.floor(baseFollowers * 0.1)),
        posts: (lastMetric?.posts ?? 100) + Math.floor(Math.random() * 3),
        engagementRate: parseFloat((Math.random() * 4 + 2).toFixed(2)),
        views: jitter(lastMetric?.views ?? baseFollowers * 3),
        likes: jitter(lastMetric?.likes ?? Math.floor(baseFollowers * 0.15)),
        comments: jitter(lastMetric?.comments ?? Math.floor(baseFollowers * 0.02)),
        shares: jitter(lastMetric?.shares ?? Math.floor(baseFollowers * 0.005)),
      },
    });
  } else if (connection.type === "web") {
    // TODO: Replace with real API calls
    // - Google Analytics 4 Data API
    // - Plausible Analytics API
    const lastWeb = await db.webMetric.findFirst({
      where: { connectionId: connection.id },
      orderBy: { date: "desc" },
    });

    await db.webMetric.create({
      data: {
        connectionId: connection.id,
        date: new Date(),
        pageViews: jitter(lastWeb?.pageViews ?? 5000),
        uniqueVisitors: jitter(lastWeb?.uniqueVisitors ?? 3000),
        bounceRate: parseFloat((Math.random() * 20 + 30).toFixed(1)),
        avgSessionDuration: parseFloat((Math.random() * 120 + 60).toFixed(0)),
        topPages: [
          { path: "/", views: jitter(1200) },
          { path: "/pricing", views: jitter(800) },
          { path: "/blog", views: jitter(600) },
        ],
      },
    });
  }

  await db.connection.update({
    where: { id: connection.id },
    data: { lastFetchedAt: new Date(), status: "active" },
  });
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
  if (intervalId) return; // Already running

  // Run immediately on start
  runRefreshCycle().catch((err) =>
    console.error("[refresh-engine] Initial cycle error:", err)
  );

  // Then every 5 minutes
  intervalId = setInterval(() => {
    runRefreshCycle().catch((err) =>
      console.error("[refresh-engine] Cycle error:", err)
    );
  }, 5 * 60 * 1000);
}
