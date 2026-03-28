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

  const rows = await db.funnelSnapshot.findMany({
    where: { date: { gte: since } },
  });

  const totalVisitors = rows.reduce((s, r) => s + r.visitors, 0);
  const totalAddToCart = rows.reduce((s, r) => s + r.addToCart, 0);
  const totalCheckout = rows.reduce((s, r) => s + r.checkout, 0);
  const totalPurchase = rows.reduce((s, r) => s + r.purchase, 0);

  const stages = [
    { name: "Visitors", count: totalVisitors, percentage: 100 },
    { name: "Add to Cart", count: totalAddToCart, percentage: totalVisitors > 0 ? parseFloat(((totalAddToCart / totalVisitors) * 100).toFixed(1)) : 0 },
    { name: "Checkout", count: totalCheckout, percentage: totalVisitors > 0 ? parseFloat(((totalCheckout / totalVisitors) * 100).toFixed(1)) : 0 },
    { name: "Purchase", count: totalPurchase, percentage: totalVisitors > 0 ? parseFloat(((totalPurchase / totalVisitors) * 100).toFixed(1)) : 0 },
  ];

  const overallRate = totalVisitors > 0 ? parseFloat(((totalPurchase / totalVisitors) * 100).toFixed(2)) : 0;

  return NextResponse.json({ stages, overallRate });
}
