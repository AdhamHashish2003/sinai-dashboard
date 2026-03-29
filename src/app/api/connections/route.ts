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
  try {
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
          dataSource: c.dataSource ?? "manual",
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
  } catch (err) {
    console.error("[connections] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { platform, username, type } = parsed.data;

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
        dataSource: "manual",
        avatarUrl: `https://picsum.photos/seed/${platform}-${username}/96/96`,
        status: "active",
      },
    });

    // Seed initial zero metric — user clicks Refresh to get real data
    await db.connectionMetric.create({
      data: {
        connectionId: connection.id,
        date: new Date(),
        followers: 0,
        following: 0,
        posts: 0,
        engagementRate: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });

    return NextResponse.json(
      { connection: { id: connection.id, platform, username, status: "active", dataSource: "manual" } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[connections] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
