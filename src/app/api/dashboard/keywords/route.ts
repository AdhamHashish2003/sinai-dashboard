import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rankings = await db.keywordRanking.findMany({
    orderBy: { recordedAt: "desc" },
    distinct: ["keyword"],
    take: 20,
  });

  const data = rankings.map((r) => ({
    keyword: r.keyword,
    position: r.position,
    prevPosition: r.prevPosition,
    change: r.prevPosition - r.position,
    url: r.url,
  }));

  return NextResponse.json({ rankings: data });
}
