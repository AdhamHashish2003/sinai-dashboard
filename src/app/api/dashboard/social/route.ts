import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read from Connection + ConnectionMetric (single source of truth)
  const connections = await db.connection.findMany({
    where: { type: "social", status: "active" },
    include: {
      metrics: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  // Build accounts summary from latest metric per connection
  const accountsSummary = connections.map((c) => {
    const latest = c.metrics[0];
    const prev = c.metrics[1];
    return {
      platform: c.platform,
      handle: c.username.startsWith("@") ? c.username : `@${c.username}`,
      followers: latest?.followers ?? 0,
      followersChange: latest && prev ? latest.followers - prev.followers : 0,
    };
  });

  // Build chart data: group by date, one series per platform
  // Aggregate followers across all connections of the same platform
  const byDate = new Map<string, Record<string, number>>();
  for (const c of connections) {
    for (const m of c.metrics) {
      const dateKey = format(m.date, "yyyy-MM-dd");
      if (!byDate.has(dateKey)) byDate.set(dateKey, {});
      const row = byDate.get(dateKey)!;
      // Sum followers per platform (in case multiple accounts on same platform)
      row[c.platform] = (row[c.platform] ?? 0) + m.followers;
    }
  }

  const chartData = Array.from(byDate.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ accounts: accountsSummary, chartData });
}
