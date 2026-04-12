/**
 * Metrics aggregation queries for /dashboard/metrics.
 *
 * All functions accept `{ productId?, since }` — when productId is null/undefined,
 * results aggregate across all products. Uses Prisma groupBy/count where possible;
 * raw SQL (via Prisma.sql) only for date_trunc, regex, and time-diff aggregations.
 */

import { Prisma } from "@prisma/client";
import { db } from "./db";

export type Period = "7d" | "30d" | "90d";

export function periodToSince(period: Period): Date {
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

interface Scope {
  productId?: string | null;
  since: Date;
}

function productFragment(productId: string | null | undefined, col = '"productId"') {
  return productId
    ? Prisma.sql`AND ${Prisma.raw(col)} = ${productId}`
    : Prisma.empty;
}

// ── Summary cards ────────────────────────────────────────────────────────────

export async function getSummary({ productId, since }: Scope) {
  const where = {
    createdAt: { gte: since },
    ...(productId ? { productId } : {}),
  };

  const [signals, replies, leads, content] = await Promise.all([
    db.signal.count({ where }),
    db.reply.count({
      where: {
        createdAt: { gte: since },
        ...(productId ? { productId } : {}),
        status: { in: ["ready_to_post", "posted"] },
      },
    }),
    db.lead.count({ where }),
    db.proofPost.count({ where }),
  ]);

  return { signals, replies, leads, content };
}

// ── Radar aggregations ───────────────────────────────────────────────────────

export async function getRadarStats({ productId, since }: Scope) {
  const where = {
    createdAt: { gte: since },
    ...(productId ? { productId } : {}),
  };

  // Per-day counts + avg score (sparkline)
  const signalsPerDay = await db.$queryRaw<
    Array<{ day: Date; count: bigint; avg_score: number | null }>
  >(Prisma.sql`
    SELECT
      date_trunc('day', "createdAt") AS day,
      COUNT(*)::bigint AS count,
      AVG("score")::float AS avg_score
    FROM "Signal"
    WHERE "createdAt" >= ${since}
    ${productFragment(productId)}
    GROUP BY day
    ORDER BY day ASC
  `);

  // Score distribution
  const scoreDist = await db.signal.groupBy({
    by: ["score"],
    where,
    _count: true,
    orderBy: { score: "asc" },
  });

  // Top subreddits (regex extract)
  const topSubsRaw = await db.$queryRaw<
    Array<{ subreddit: string; count: bigint }>
  >(Prisma.sql`
    SELECT
      substring("sourceUrl" from 'reddit\\.com/r/([^/]+)/') AS subreddit,
      COUNT(*)::bigint AS count
    FROM "Signal"
    WHERE "createdAt" >= ${since}
      AND "source" = 'reddit'
      ${productFragment(productId)}
    GROUP BY subreddit
    HAVING substring("sourceUrl" from 'reddit\\.com/r/([^/]+)/') IS NOT NULL
    ORDER BY count DESC
    LIMIT 5
  `);

  return {
    perDay: signalsPerDay.map((r) => ({
      date: (r.day instanceof Date ? r.day : new Date(r.day))
        .toISOString()
        .slice(0, 10),
      count: Number(r.count),
      avgScore: r.avg_score != null ? Number(r.avg_score) : 0,
    })),
    scoreDist: scoreDist.map((s) => ({ score: s.score, count: s._count })),
    topSubs: topSubsRaw.map((r) => ({
      subreddit: r.subreddit,
      count: Number(r.count),
    })),
  };
}

// ── Swarm aggregations ───────────────────────────────────────────────────────

export async function getSwarmStats({ productId, since }: Scope) {
  const where = {
    createdAt: { gte: since },
    ...(productId ? { productId } : {}),
  };

  const byStatus = await db.reply.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  const counts: Record<string, number> = Object.fromEntries(
    byStatus.map((r) => [r.status, r._count])
  );
  const drafted =
    (counts.pending_draft ?? 0) +
    (counts.ready_to_post ?? 0) +
    (counts.posted ?? 0) +
    (counts.rejected ?? 0);
  const approved = counts.ready_to_post ?? 0;
  const posted = counts.posted ?? 0;
  const rejected = counts.rejected ?? 0;
  const decided = posted + rejected;
  const approvalRate = decided > 0 ? (posted / decided) * 100 : null;

  // Avg time from signal created → reply posted
  const timeRow = await db.$queryRaw<Array<{ avg_hours: number | null }>>(Prisma.sql`
    SELECT AVG(EXTRACT(EPOCH FROM (r."postedAt" - s."createdAt")) / 3600)::float AS avg_hours
    FROM "Reply" r
    JOIN "Signal" s ON r."signalId" = s.id
    WHERE r.status = 'posted'
      AND r."postedAt" IS NOT NULL
      AND r."createdAt" >= ${since}
      ${productFragment(productId, 'r."productId"')}
  `);
  const avgHoursToPost =
    timeRow[0]?.avg_hours != null ? Number(timeRow[0].avg_hours) : null;

  return {
    drafted,
    approved,
    posted,
    rejected,
    pendingDraft: counts.pending_draft ?? 0,
    approvalRate,
    avgHoursToPost,
  };
}

// ── CRM aggregations ─────────────────────────────────────────────────────────

const LEAD_STATUSES = [
  "new",
  "enriched",
  "contacted",
  "replied",
  "trial",
  "paid",
  "dead",
] as const;

export async function getCrmStats({ productId, since }: Scope) {
  const whereAll = productId ? { productId } : {};
  const whereSince = { createdAt: { gte: since }, ...whereAll };

  const byStatus = await db.lead.groupBy({
    by: ["status"],
    where: whereAll,
    _count: true,
  });
  const statusCounts: Record<string, number> = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, 0])
  );
  for (const row of byStatus) {
    statusCounts[row.status] = row._count;
  }

  // Funnel: counts leads currently at or beyond each stage
  const funnel = LEAD_STATUSES.slice(0, 6).map((status, i) => {
    const laterStatuses = LEAD_STATUSES.slice(i, 6); // exclude 'dead'
    const count = laterStatuses.reduce(
      (sum, s) => sum + (statusCounts[s] ?? 0),
      0
    );
    return { status, count };
  });

  const leadsPerDay = await db.$queryRaw<
    Array<{ day: Date; count: bigint }>
  >(Prisma.sql`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "Lead"
    WHERE "createdAt" >= ${since}
    ${productFragment(productId)}
    GROUP BY day
    ORDER BY day ASC
  `);

  const sources = await db.lead.groupBy({
    by: ["source"],
    where: whereSince,
    _count: true,
    orderBy: { _count: { source: "desc" } },
    take: 5,
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleContacted = await db.lead.count({
    where: {
      ...whereAll,
      status: "contacted",
      OR: [{ lastTouchAt: null }, { lastTouchAt: { lt: sevenDaysAgo } }],
    },
  });

  return {
    statusCounts,
    funnel,
    perDay: leadsPerDay.map((r) => ({
      date: (r.day instanceof Date ? r.day : new Date(r.day))
        .toISOString()
        .slice(0, 10),
      count: Number(r.count),
    })),
    sources: sources.map((s) => ({ source: s.source, count: s._count })),
    staleContacted,
  };
}

// ── Content Flywheel aggregations ────────────────────────────────────────────

export async function getContentStats({ productId, since }: Scope) {
  const where = {
    createdAt: { gte: since },
    ...(productId ? { productId } : {}),
  };

  const byStatus = await db.proofPost.groupBy({
    by: ["status"],
    where,
    _count: true,
  });
  const statusCounts: Record<string, number> = Object.fromEntries(
    byStatus.map((r) => [r.status, r._count])
  );

  const byType = await db.proofPost.groupBy({
    by: ["postType"],
    where,
    _count: true,
  });

  const topEngagement = await db.proofPost.findMany({
    where: { ...where, postedEngagement: { not: null } },
    orderBy: { postedEngagement: "desc" },
    take: 3,
    select: {
      id: true,
      postType: true,
      topic: true,
      postedEngagement: true,
      postedAt: true,
    },
  });

  return {
    statusCounts,
    byType: byType.map((r) => ({ postType: r.postType, count: r._count })),
    topEngagement,
  };
}

// ── Action items (priority order per user spec) ─────────────────────────────

export async function getActionItems({
  productId,
}: {
  productId?: string | null;
}) {
  const whereProduct = productId ? { productId } : {};

  const [highIntentUnanswered, staleContacted, unapprovedDrafts] =
    await Promise.all([
      db.signal.count({
        where: { ...whereProduct, score: { gte: 9 }, status: "new" },
      }),
      db.lead.count({
        where: {
          ...whereProduct,
          status: "contacted",
          OR: [
            { lastTouchAt: null },
            { lastTouchAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      db.proofPost.count({
        where: {
          ...whereProduct,
          status: "draft",
          generatedBody: { not: "" },
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  const items: Array<{ priority: number; text: string; count: number }> = [];
  if (highIntentUnanswered > 0) {
    items.push({
      priority: 1,
      count: highIntentUnanswered,
      text: `${highIntentUnanswered} high-intent signal${highIntentUnanswered > 1 ? "s" : ""} (score 9-10) awaiting reply`,
    });
  }
  if (staleContacted > 0) {
    items.push({
      priority: 2,
      count: staleContacted,
      text: `${staleContacted} lead${staleContacted > 1 ? "s" : ""} stuck in 'contacted' for >7 days`,
    });
  }
  if (unapprovedDrafts > 0) {
    items.push({
      priority: 3,
      count: unapprovedDrafts,
      text: `${unapprovedDrafts} content draft${unapprovedDrafts > 1 ? "s" : ""} awaiting approval (>24h old)`,
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
}
