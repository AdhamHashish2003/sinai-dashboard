import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/leads/export?productId=xxx
 * Returns leads for a product as a CSV file download.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where = productId ? { productId } : {};

    const leads = await db.lead.findMany({
      where,
      include: { product: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const header = [
      "id",
      "product",
      "name",
      "address",
      "phone",
      "business_emails",
      "website",
      "instagram",
      "tiktok",
      "has_social_media",
      "good_social_media",
      "max_video_views",
      "founding_date",
      "is_franchise",
      "franchise_reason",
      "city",
      "state",
      "status",
      "source",
      "source_url",
      "last_touch_at",
      "reply_received",
      "notes",
      "created_at",
    ];

    const rows = leads.map((l) => {
      const enrichment = (l.enrichmentJson ?? {}) as Record<string, unknown>;
      const emails = asStringArray(enrichment.emails);
      if (l.email && !emails.includes(l.email)) emails.unshift(l.email);

      return [
        l.id,
        l.product.slug,
        l.name,
        asString(enrichment.address),
        asString(enrichment.phone),
        emails.join("; "),
        asString(enrichment.website),
        asStringArray(enrichment.instagram).join("; "),
        asStringArray(enrichment.tiktok).join("; "),
        enrichment.hasSocialMedia === true ? "yes" : "no",
        enrichment.goodSocialMedia === true
          ? "yes"
          : enrichment.goodSocialMedia === false
          ? "no"
          : "unknown",
        asNumber(enrichment.maxVideoViews) ?? "",
        asString(enrichment.foundingDate),
        enrichment.isFranchise === true ? "yes" : "no",
        asString(enrichment.franchiseReason),
        l.city ?? "",
        l.state ?? "",
        l.status,
        l.source,
        l.sourceUrl ?? "",
        l.lastTouchAt?.toISOString() ?? "",
        l.replyReceived ? "yes" : "no",
        (l.notes ?? "").replace(/\r?\n/g, " "),
        l.createdAt.toISOString(),
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            if (s.includes(",") || s.includes('"') || s.includes("\n")) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          })
          .join(",")
      )
      .join("\n");

    const filename = productId
      ? `leads-${leads[0]?.product.slug ?? productId}-${new Date().toISOString().slice(0, 10)}.csv`
      : `leads-all-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[leads/export] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}
