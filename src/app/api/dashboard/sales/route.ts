import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Math.min(Number(searchParams.get("period")) || 30, 90);
  const since = startOfDay(subDays(new Date(), days - 1));

  const rows = await db.salesOrder.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const chartData = rows.map((r) => ({
    date: format(r.date, "yyyy-MM-dd"),
    revenueCents: r.revenueCents,
    orders: r.totalOrders,
  }));

  const totalRevenueCents = rows.reduce((s, r) => s + r.revenueCents, 0);
  const totalOrders = rows.reduce((s, r) => s + r.totalOrders, 0);
  const aovCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  const prevSince = startOfDay(subDays(new Date(), days * 2 - 1));
  const prevRows = await db.salesOrder.findMany({
    where: { date: { gte: prevSince, lt: since } },
  });
  const prevRevenue = prevRows.reduce((s, r) => s + r.revenueCents, 0);
  const revenueChangePct = prevRevenue > 0
    ? parseFloat((((totalRevenueCents - prevRevenue) / prevRevenue) * 100).toFixed(1))
    : 0;

  return NextResponse.json({ chartData, totalRevenueCents, totalOrders, aovCents, revenueChangePct });
}
