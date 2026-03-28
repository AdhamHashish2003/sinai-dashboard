import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateConnectionSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "linkedin"]),
  username: z.string().min(1).max(100),
  type: z.enum(["social", "web"]).default("social"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await db.connection.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      metrics: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    connections: connections.map((c) => {
      const latest = c.metrics[0];
      return {
        id: c.id,
        platform: c.platform,
        username: c.username,
        type: c.type,
        status: c.status,
        avatarUrl: c.avatarUrl,
        bio: c.bio,
        lastFetchedAt: c.lastFetchedAt?.toISOString() ?? null,
        refreshIntervalMinutes: c.refreshIntervalMinutes,
        createdAt: c.createdAt.toISOString(),
        followers: latest?.followers ?? 0,
        engagementRate: latest?.engagementRate ?? 0,
      };
    }),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { platform, username, type } = parsed.data;

  // Check for existing
  const existing = await db.connection.findUnique({
    where: { platform_username: { platform, username } },
  });
  if (existing) {
    return NextResponse.json({ error: "Connection already exists" }, { status: 409 });
  }

  const connection = await db.connection.create({
    data: {
      platform,
      username,
      type,
      avatarUrl: `https://picsum.photos/seed/${platform}-${username}/96/96`,
      status: "active",
    },
  });

  // Seed initial mock metric so the connection shows data immediately
  const baseFollowers = Math.floor(Math.random() * 50_000) + 10_000;
  await db.connectionMetric.create({
    data: {
      connectionId: connection.id,
      date: new Date(),
      followers: baseFollowers,
      following: Math.floor(baseFollowers * 0.1),
      posts: Math.floor(Math.random() * 200) + 50,
      engagementRate: parseFloat((Math.random() * 4 + 2).toFixed(2)),
      views: Math.floor(baseFollowers * 3),
      likes: Math.floor(baseFollowers * 0.15),
      comments: Math.floor(baseFollowers * 0.02),
      shares: Math.floor(baseFollowers * 0.005),
    },
  });

  return NextResponse.json({ connection: { id: connection.id, platform, username, status: "active" } }, { status: 201 });
}
