import { db } from "@/lib/db";
import { RadarClient } from "@/components/radar/radar-client";

export default async function RadarPage() {
  const [signals, products] = await Promise.all([
    db.signal.findMany({
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.product.findMany({
      where: { status: "active" },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <RadarClient
      signals={signals.map((s) => ({
        id: s.id,
        productId: s.productId,
        productName: s.product.name,
        productSlug: s.product.slug,
        source: s.source,
        sourceUrl: s.sourceUrl,
        title: s.title,
        body: s.body,
        author: s.author,
        score: s.score,
        reason: s.reason,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      }))}
      products={products}
    />
  );
}
