import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await db.contentPost.findMany({
    where: {
      OR: [
        { status: "scheduled" },
        { status: "draft" },
        { status: "published", publishedAt: { gte: subDays(new Date(), 7) } },
      ],
    },
    orderBy: [
      { status: "asc" },
      { scheduledAt: "asc" },
    ],
    take: 20,
    include: { account: { select: { handle: true } } },
  });

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      handle: p.account.handle,
    })),
  });
}
