import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "30"; // 7, 30, 90
  const days = Math.min(Number(period) || 30, 90);
  const since = startOfDay(subDays(new Date(), days - 1));

  const rows = await db.pageView.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const chartData = rows.map((r) => ({
    date: format(r.date, "yyyy-MM-dd"),
    totalViews: r.totalViews,
    uniqueVisitors: r.uniqueVisitors,
  }));

  const totalViews = rows.reduce((s, r) => s + r.totalViews, 0);
  const totalUnique = rows.reduce((s, r) => s + r.uniqueVisitors, 0);

  // Compare to previous period
  const prevSince = startOfDay(subDays(new Date(), days * 2 - 1));
  const prevRows = await db.pageView.findMany({
    where: { date: { gte: prevSince, lt: since } },
  });
  const prevTotal = prevRows.reduce((s, r) => s + r.totalViews, 0);
  const viewsChangePct = prevTotal > 0 ? ((totalViews - prevTotal) / prevTotal) * 100 : 0;

  return NextResponse.json({
    chartData,
    totalViews,
    totalUnique,
    viewsChangePct: parseFloat(viewsChangePct.toFixed(1)),
    period: `${days}d`,
  });
}
