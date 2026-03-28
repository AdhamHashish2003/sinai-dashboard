import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since30d = startOfDay(subDays(new Date(), 30));

  // Read from Connection model (single source of truth)
  const connections = await db.connection.findMany({
    where: { type: "social", status: { not: "paused" } },
    include: {
      metrics: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  // Also fetch recent published posts from ContentPost where the account handle matches
  // This bridges the legacy seed data until all posts come from connections
  const allPosts = await db.contentPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    include: { account: { select: { handle: true, platform: true } } },
  });

  const result = connections.map((conn) => {
    const latestMetric = conn.metrics[0];
    const oldestMetric = conn.metrics[conn.metrics.length - 1];

    const followers = latestMetric?.followers ?? 0;
    const oldFollowers = oldestMetric?.followers ?? followers;
    const followersChange30d = followers - oldFollowers;
    const growthPct30d = oldFollowers > 0
      ? parseFloat(((followersChange30d / oldFollowers) * 100).toFixed(1))
      : 0;

    const recentMetrics = conn.metrics.filter((m) => m.date >= since30d);
    const avgEngagementRate = recentMetrics.length > 0
      ? parseFloat((recentMetrics.reduce((s, m) => s + m.engagementRate, 0) / recentMetrics.length).toFixed(2))
      : 0;

    // Find matching posts by handle + platform
    const handle = conn.username.startsWith("@") ? conn.username : `@${conn.username}`;
    const matchingPosts = allPosts
      .filter((p) => p.account.handle === handle && p.account.platform === conn.platform)
      .slice(0, 6);

    return {
      id: conn.id,
      platform: conn.platform,
      handle: conn.username.startsWith("@") ? conn.username : `@${conn.username}`,
      avatarUrl: conn.avatarUrl,
      bio: conn.bio,
      followers,
      followersChange30d,
      growthPct30d,
      avgEngagementRate,
      recentPosts: matchingPosts.map((p) => ({
        id: p.id,
        title: p.title,
        thumbnailUrl: p.thumbnailUrl,
        status: p.status,
        publishedAt: p.publishedAt?.toISOString() ?? null,
      })),
    };
  });

  return NextResponse.json({ accounts: result });
}
