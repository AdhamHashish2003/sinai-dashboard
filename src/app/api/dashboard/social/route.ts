import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = startOfDay(subDays(new Date(), 29));

  const [accounts, metrics] = await Promise.all([
    db.socialAccount.findMany({ select: { id: true, platform: true, handle: true } }),
    db.socialMetric.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
      select: { accountId: true, followers: true, followersChange: true, recordedAt: true },
    }),
  ]);

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.platform]));

  // Latest followers per account
  const latestFollowers = new Map<string, { followers: number; followersChange: number }>();
  for (const m of metrics) {
    latestFollowers.set(m.accountId, { followers: m.followers, followersChange: m.followersChange });
  }

  const accountsSummary = accounts.map((a) => ({
    platform: a.platform,
    handle: a.handle,
    followers: latestFollowers.get(a.id)?.followers ?? 0,
    followersChange: latestFollowers.get(a.id)?.followersChange ?? 0,
  }));

  // Chart data grouped by date → platform
  const byDate = new Map<string, Record<string, number>>();
  for (const m of metrics) {
    const dateKey = format(m.recordedAt, "yyyy-MM-dd");
    if (!byDate.has(dateKey)) byDate.set(dateKey, {});
    byDate.get(dateKey)![accountMap[m.accountId]] = m.followers;
  }

  const chartData = Array.from(byDate.entries()).map(([date, values]) => ({ date, ...values }));

  return NextResponse.json({ accounts: accountsSummary, chartData });
}
