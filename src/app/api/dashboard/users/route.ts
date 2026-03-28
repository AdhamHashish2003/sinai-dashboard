import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(new Date(), 1));

  const products = await db.saasProduct.findMany({
    select: { id: true, name: true },
  });

  const data = await Promise.all(
    products.map(async (p) => {
      const [today_metrics, yesterday_metrics] = await Promise.all([
        db.saasMetric.findFirst({
          where: { productId: p.id, recordedAt: { gte: today } },
          select: { activeUsers: true },
          orderBy: { recordedAt: "desc" },
        }),
        db.saasMetric.findFirst({
          where: { productId: p.id, recordedAt: { gte: yesterday, lt: today } },
          select: { activeUsers: true },
          orderBy: { recordedAt: "desc" },
        }),
      ]);

      const activeUsers = today_metrics?.activeUsers ?? 0;
      const prevActiveUsers = yesterday_metrics?.activeUsers ?? 0;
      const trend = prevActiveUsers > 0 ? ((activeUsers - prevActiveUsers) / prevActiveUsers) * 100 : 0;

      return { productName: p.name, activeUsers, prevActiveUsers, trend };
    })
  );

  return NextResponse.json({ products: data });
}
