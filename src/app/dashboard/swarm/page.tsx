import { db } from "@/lib/db";
import { SwarmClient } from "@/components/swarm/swarm-client";

export default async function SwarmPage() {
  const replies = await db.reply.findMany({
    include: {
      signal: {
        select: {
          id: true,
          title: true,
          body: true,
          author: true,
          source: true,
          sourceUrl: true,
          score: true,
          reason: true,
        },
      },
      product: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <SwarmClient
      replies={replies.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        productSlug: r.product.slug,
        signalId: r.signalId,
        signalTitle: r.signal.title,
        signalBody: r.signal.body,
        signalAuthor: r.signal.author,
        signalSource: r.signal.source,
        signalUrl: r.signal.sourceUrl,
        signalScore: r.signal.score,
        signalReason: r.signal.reason,
        draftBody: r.draftBody,
        draftVersions: Array.isArray(r.draftVersions)
          ? (r.draftVersions as Array<{ body: string; createdAt?: string; note?: string }>)
          : [],
        status: r.status,
        platform: r.platform,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        postedAt: r.postedAt?.toISOString() ?? null,
      }))}
    />
  );
}
