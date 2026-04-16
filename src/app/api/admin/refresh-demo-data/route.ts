import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

/**
 * POST /api/admin/refresh-demo-data
 *
 * The dashboard's MRR chart + SaaS metrics widgets are demo data generated
 * by `prisma/seed.ts` with `recordedAt = subDays(new Date(), N)`. Once the
 * seed runs, timestamps are frozen — if the seed last ran in March, the
 * chart still shows March dates in April. Users look at a dead chart.
 *
 * This endpoint shifts every time-based demo row so the most recent record
 * lands on today. It's idempotent: if the newest record is already "today",
 * nothing happens. Once a real webhook ingest kicks in (Stripe, etc.), demo
 * data can be deleted and this endpoint retired.
 *
 * Auth-gated. Safe to call from a cron or manually from the dashboard.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Shift SaaS metrics so the latest recordedAt aligns to today.
  const latestSaasMetric = await db.saasMetric.findFirst({
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });

  let shiftedSaas = 0;
  if (latestSaasMetric) {
    const shiftMs = startOfToday.getTime() - latestSaasMetric.recordedAt.getTime();
    if (shiftMs > 0) {
      const rows = await db.saasMetric.findMany({ select: { id: true, recordedAt: true } });
      await Promise.all(
        rows.map((r) =>
          db.saasMetric.update({
            where: { id: r.id },
            data: { recordedAt: new Date(r.recordedAt.getTime() + shiftMs) },
          })
        )
      );
      shiftedSaas = rows.length;
    }
  }

  // Shift SocialMetric timestamps the same way.
  const latestSocial = await db.socialMetric.findFirst({
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  let shiftedSocial = 0;
  if (latestSocial) {
    const shiftMs = startOfToday.getTime() - latestSocial.recordedAt.getTime();
    if (shiftMs > 0) {
      const rows = await db.socialMetric.findMany({ select: { id: true, recordedAt: true } });
      await Promise.all(
        rows.map((r) =>
          db.socialMetric.update({
            where: { id: r.id },
            data: { recordedAt: new Date(r.recordedAt.getTime() + shiftMs) },
          })
        )
      );
      shiftedSocial = rows.length;
    }
  }

  return NextResponse.json({
    success: true,
    shiftedSaasMetrics: shiftedSaas,
    shiftedSocialMetrics: shiftedSocial,
    alignedTo: startOfToday.toISOString(),
  });
}
