import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = startOfDay(subDays(new Date(), 29));

  const [products, metrics] = await Promise.all([
    db.saasProduct.findMany({ select: { id: true, name: true } }),
    db.saasMetric.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
      select: { productId: true, mrrCents: true, recordedAt: true },
    }),
  ]);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const productNames = products.map((p) => p.name);

  // Group by date → product
  const byDate = new Map<string, Record<string, number>>();
  for (const m of metrics) {
    const dateKey = format(m.recordedAt, "yyyy-MM-dd");
    if (!byDate.has(dateKey)) byDate.set(dateKey, {});
    byDate.get(dateKey)![productMap[m.productId]] = m.mrrCents;
  }

  const chartData = Array.from(byDate.entries()).map(([date, values]) => ({
    date,
    ...values,
  }));

  // Total MRR: sum of latest entry per product
  const latestByProduct = new Map<string, number>();
  for (const m of metrics) {
    latestByProduct.set(m.productId, m.mrrCents);
  }
  const totalMrrCents = Array.from(latestByProduct.values()).reduce((a, b) => a + b, 0);

  // MRR change vs 7 days ago
  const weekAgo = startOfDay(subDays(new Date(), 7));
  const oldMetrics = await db.saasMetric.findMany({
    where: { recordedAt: { gte: weekAgo, lt: startOfDay(subDays(new Date(), 6)) } },
    select: { mrrCents: true },
  });
  const oldTotal = oldMetrics.reduce((a, m) => a + m.mrrCents, 0);
  const mrrChangePct = oldTotal > 0 ? ((totalMrrCents - oldTotal) / oldTotal) * 100 : 0;

  return NextResponse.json({ products: productNames, chartData, totalMrrCents, mrrChangePct });
}
