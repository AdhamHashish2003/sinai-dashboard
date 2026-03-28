import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Math.min(Number(searchParams.get("period")) || 30, 90);

  const latest = await db.seoSnapshot.findFirst({ orderBy: { date: "desc" } });

  const oldDate = startOfDay(subDays(new Date(), days));
  const old = await db.seoSnapshot.findFirst({
    where: { date: { lte: oldDate } },
    orderBy: { date: "desc" },
  });

  const domainAuthority = latest?.domainAuthority ?? 0;
  const daChangePct = old && old.domainAuthority > 0
    ? parseFloat((((domainAuthority - old.domainAuthority) / old.domainAuthority) * 100).toFixed(1))
    : 0;

  const indexedPages = latest?.indexedPages ?? 0;
  const indexedChangePct = old && old.indexedPages > 0
    ? parseFloat((((indexedPages - old.indexedPages) / old.indexedPages) * 100).toFixed(1))
    : 0;

  const recentSnapshots = await db.seoSnapshot.findMany({
    where: { date: { gte: startOfDay(subDays(new Date(), 7)) } },
    orderBy: { date: "desc" },
  });

  const landingMap = new Map<string, number>();
  for (const s of recentSnapshots) {
    landingMap.set(s.topLandingPage, (landingMap.get(s.topLandingPage) ?? 0) + s.topLandingViews);
  }

  const topLandingPages = Array.from(landingMap.entries())
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return NextResponse.json({ domainAuthority, daChangePct, indexedPages, indexedChangePct, topLandingPages });
}
