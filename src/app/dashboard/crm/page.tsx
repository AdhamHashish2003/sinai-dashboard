import { db } from "@/lib/db";
import { CrmClient } from "@/components/crm/crm-client";

export default async function CrmPage() {
  const [leads, products] = await Promise.all([
    db.lead.findMany({
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.product.findMany({
      where: { status: { in: ["active", "launched"] } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CrmClient
      products={products}
      leads={leads.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product.name,
        productSlug: l.product.slug,
        source: l.source,
        sourceUrl: l.sourceUrl,
        name: l.name,
        email: l.email,
        company: l.company,
        role: l.role,
        city: l.city,
        state: l.state,
        enrichmentJson: (l.enrichmentJson as Record<string, unknown>) ?? {},
        status: l.status,
        lastTouchAt: l.lastTouchAt?.toISOString() ?? null,
        replyReceived: l.replyReceived,
        notes: l.notes,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
