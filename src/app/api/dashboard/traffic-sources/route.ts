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
  const since = startOfDay(subDays(new Date(), days - 1));

  const rows = await db.trafficSource.findMany({
    where: { date: { gte: since } },
  });

  const bySource = new Map<string, number>();
  for (const r of rows) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + r.visitors);
  }

  const total = Array.from(bySource.values()).reduce((a, b) => a + b, 0);

  const sources = Array.from(bySource.entries())
    .map(([source, visitors]) => ({
      source,
      visitors,
      percentage: parseFloat(((visitors / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.visitors - a.visitors);

  return NextResponse.json({ sources, total });
}
