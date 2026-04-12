import { db } from "@/lib/db";
import { ContentClient } from "@/components/content/content-client";

export default async function ContentPage() {
  const [posts, products] = await Promise.all([
    db.proofPost.findMany({
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.product.findMany({
      where: { status: { in: ["active", "launched"] } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ContentClient
      products={products}
      posts={posts.map((p) => ({
        id: p.id,
        productId: p.productId,
        productName: p.product.name,
        productSlug: p.product.slug,
        postType: p.postType,
        topic: p.topic,
        generatedBody: p.generatedBody,
        generatedAssets: Array.isArray(p.generatedAssets)
          ? (p.generatedAssets as string[])
          : [],
        targetPlatforms: Array.isArray(p.targetPlatforms)
          ? (p.targetPlatforms as string[])
          : [],
        postedPlatforms: Array.isArray(p.postedPlatforms)
          ? (p.postedPlatforms as string[])
          : [],
        draftVersions: Array.isArray(p.draftVersions)
          ? (p.draftVersions as Array<{ body: string; note?: string }>)
          : [],
        status: p.status,
        postedEngagement: p.postedEngagement ?? 0,
        errorMessage: p.errorMessage ?? "",
        scheduledFor: p.scheduledFor?.toISOString() ?? "",
        postedAt: p.postedAt?.toISOString() ?? "",
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
