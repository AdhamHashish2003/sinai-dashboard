import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const maxDuration = 60;

/**
 * POST /api/metrics/digest
 * Body: { productId?: string, mode?: "daily" | "weekly" }
 *
 * Mirror of workers/metrics/main.py but runs inline so the "Send Digest Now"
 * button on /dashboard/metrics fires immediately. Reuses the same 6-section
 * plain-text format and action item priority order.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const mode = (body?.mode ?? "daily") as "daily" | "weekly";
    const productId = body?.productId as string | undefined;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN not set" },
        { status: 503 }
      );
    }

    const products = await db.product.findMany({
      where: productId
        ? { id: productId }
        : { status: { in: ["active", "launched"] } },
      select: { id: true, slug: true, name: true, telegramChatId: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: "No active products" }, { status: 404 });
    }

    const now = new Date();
    const since = new Date(
      now.getTime() - (mode === "weekly" ? 7 : 1) * 24 * 60 * 60 * 1000
    );
    const periodLabel = mode === "weekly" ? "last 7d" : "last 24h";

    const results: Array<{
      product: string;
      skipped: boolean;
      telegramSent: boolean;
      reason?: string;
      messagePreview?: string;
    }> = [];

    const dashboardUrl =
      process.env.DASHBOARD_URL ?? "https://sinai-dashboard-production.up.railway.app";

    for (const product of products) {
      const metrics = await collectMetrics(product.id, since);

      if (allZero(metrics)) {
        results.push({ product: product.slug, skipped: true, telegramSent: false, reason: "no_activity" });
        continue;
      }

      const message = buildDailyMessage(product.name, metrics, periodLabel, dashboardUrl);

      if (!product.telegramChatId) {
        results.push({
          product: product.slug,
          skipped: true,
          telegramSent: false,
          reason: "no_chat_id",
          messagePreview: message.split("\n").slice(0, 3).join("\n"),
        });
        continue;
      }

      try {
        const text = message.length > 4000 ? message.slice(0, 3990) + "\n…" : message;
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: product.telegramChatId,
            text,
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        results.push({
          product: product.slug,
          skipped: false,
          telegramSent: tgRes.ok,
          reason: tgRes.ok ? undefined : `telegram_${tgRes.status}`,
        });
      } catch (err) {
        results.push({
          product: product.slug,
          skipped: false,
          telegramSent: false,
          reason: err instanceof Error ? err.message.slice(0, 100) : "unknown",
        });
      }
    }

    return NextResponse.json({ success: true, mode, results });
  } catch (err) {
    console.error("[metrics/digest] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

// ── Aggregation ──────────────────────────────────────────────────────────────

interface Metrics {
  radar: {
    total: number;
    highIntent: number;
    avgScore: number;
    topSub: string | null;
    topSubCount: number;
  };
  swarm: { drafted: number; posted: number; rejected: number; ready: number };
  crm: { added: number; contacted: number; replied: number; converted: number; total: number };
  content: { generated: number; posted: number; approved: number };
  actions: { highIntentPending: number; staleContacted: number; unapprovedDrafts: number };
}

async function collectMetrics(productId: string, since: Date): Promise<Metrics> {
  const [
    radarRow,
    topSubRows,
    swarmRow,
    crmRow,
    crmTotalRow,
    contentRow,
    highIntentPending,
    staleContacted,
    unapprovedDrafts,
  ] = await Promise.all([
    db.$queryRaw<Array<{ total: number; high_intent: number; avg_score: number | null }>>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE score >= 9)::int AS high_intent,
        AVG(score)::float AS avg_score
      FROM "Signal"
      WHERE "productId" = ${productId} AND "createdAt" >= ${since}
    `,
    db.$queryRaw<Array<{ sub: string; count: number }>>`
      SELECT substring("sourceUrl" from 'reddit\\.com/r/([^/]+)/') AS sub,
             COUNT(*)::int AS count
      FROM "Signal"
      WHERE "productId" = ${productId}
        AND "createdAt" >= ${since}
        AND "source" = 'reddit'
        AND substring("sourceUrl" from 'reddit\\.com/r/([^/]+)/') IS NOT NULL
      GROUP BY sub
      ORDER BY count DESC
      LIMIT 1
    `,
    db.$queryRaw<
      Array<{ drafted: number; posted: number; rejected: number; ready: number }>
    >`
      SELECT
        COUNT(*)::int AS drafted,
        COUNT(*) FILTER (WHERE status = 'posted')::int AS posted,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'ready_to_post')::int AS ready
      FROM "Reply"
      WHERE "productId" = ${productId} AND "createdAt" >= ${since}
    `,
    db.$queryRaw<
      Array<{ added: number; contacted: number; replied: number; converted: number }>
    >`
      SELECT
        COUNT(*)::int AS added,
        COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted,
        COUNT(*) FILTER (WHERE status = 'replied')::int AS replied,
        COUNT(*) FILTER (WHERE status IN ('trial', 'paid'))::int AS converted
      FROM "Lead"
      WHERE "productId" = ${productId} AND "createdAt" >= ${since}
    `,
    db.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total FROM "Lead" WHERE "productId" = ${productId}
    `,
    db.$queryRaw<
      Array<{ generated: number; posted: number; approved: number }>
    >`
      SELECT
        COUNT(*)::int AS generated,
        COUNT(*) FILTER (WHERE status = 'posted')::int AS posted,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
      FROM "ProofPost"
      WHERE "productId" = ${productId} AND "createdAt" >= ${since}
    `,
    db.signal.count({
      where: { productId, score: { gte: 9 }, status: "new" },
    }),
    db.lead.count({
      where: {
        productId,
        status: "contacted",
        OR: [
          { lastTouchAt: null },
          { lastTouchAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),
    db.proofPost.count({
      where: {
        productId,
        status: "draft",
        generatedBody: { not: "" },
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    radar: {
      total: Number(radarRow[0]?.total ?? 0),
      highIntent: Number(radarRow[0]?.high_intent ?? 0),
      avgScore: Number(radarRow[0]?.avg_score ?? 0),
      topSub: topSubRows[0]?.sub ?? null,
      topSubCount: Number(topSubRows[0]?.count ?? 0),
    },
    swarm: {
      drafted: Number(swarmRow[0]?.drafted ?? 0),
      posted: Number(swarmRow[0]?.posted ?? 0),
      rejected: Number(swarmRow[0]?.rejected ?? 0),
      ready: Number(swarmRow[0]?.ready ?? 0),
    },
    crm: {
      added: Number(crmRow[0]?.added ?? 0),
      contacted: Number(crmRow[0]?.contacted ?? 0),
      replied: Number(crmRow[0]?.replied ?? 0),
      converted: Number(crmRow[0]?.converted ?? 0),
      total: Number(crmTotalRow[0]?.total ?? 0),
    },
    content: {
      generated: Number(contentRow[0]?.generated ?? 0),
      posted: Number(contentRow[0]?.posted ?? 0),
      approved: Number(contentRow[0]?.approved ?? 0),
    },
    actions: {
      highIntentPending,
      staleContacted,
      unapprovedDrafts,
    },
  };
}

function allZero(m: Metrics): boolean {
  return (
    m.radar.total === 0 &&
    m.swarm.drafted === 0 &&
    m.crm.added === 0 &&
    m.content.generated === 0 &&
    m.actions.highIntentPending === 0 &&
    m.actions.staleContacted === 0 &&
    m.actions.unapprovedDrafts === 0
  );
}

function buildActionItems(a: Metrics["actions"]): string[] {
  const items: Array<{ priority: number; text: string }> = [];
  if (a.highIntentPending > 0) {
    items.push({
      priority: 1,
      text: `⚡ ${a.highIntentPending} high-intent signal${a.highIntentPending !== 1 ? "s" : ""} (9-10) awaiting reply`,
    });
  }
  if (a.staleContacted > 0) {
    items.push({
      priority: 2,
      text: `⚡ ${a.staleContacted} lead${a.staleContacted !== 1 ? "s" : ""} stuck in 'contacted' >7d`,
    });
  }
  if (a.unapprovedDrafts > 0) {
    items.push({
      priority: 3,
      text: `⚡ ${a.unapprovedDrafts} content draft${a.unapprovedDrafts !== 1 ? "s" : ""} awaiting approval >24h`,
    });
  }
  return items
    .sort((x, y) => x.priority - y.priority)
    .slice(0, 3)
    .map((i) => i.text);
}

function buildDailyMessage(
  productName: string,
  m: Metrics,
  periodLabel: string,
  dashboardUrl: string
): string {
  const lines: string[] = [
    `📊 ${productName} — ${periodLabel}`,
    "",
    "RADAR",
    `  Signals found: ${m.radar.total}  (9-10: ${m.radar.highIntent})`,
    `  Avg intent score: ${m.radar.avgScore.toFixed(1)}`,
  ];
  if (m.radar.topSub) {
    lines.push(`  Top sub: /r/${m.radar.topSub} (${m.radar.topSubCount})`);
  }
  lines.push(
    "",
    "SWARM",
    `  Drafted: ${m.swarm.drafted}  Posted: ${m.swarm.posted}  Rejected: ${m.swarm.rejected}  Ready: ${m.swarm.ready}`,
    "",
    "CRM",
    `  New leads: ${m.crm.added}  Contacted: ${m.crm.contacted}  Replied: ${m.crm.replied}`,
    `  Converted (trial/paid): ${m.crm.converted}  | Total lifetime: ${m.crm.total}`,
    "",
    "CONTENT",
    `  Generated: ${m.content.generated}  Approved: ${m.content.approved}  Posted: ${m.content.posted}`
  );

  const actions = buildActionItems(m.actions);
  if (actions.length > 0) {
    lines.push("", "ACTION ITEMS");
    for (const a of actions) lines.push(`  ${a}`);
  }

  lines.push("", `→ ${dashboardUrl}/dashboard/metrics`);
  return lines.slice(0, 40).join("\n");
}

// Silence unused-import warning — Prisma is used via db.$queryRaw tagged templates
void Prisma;
