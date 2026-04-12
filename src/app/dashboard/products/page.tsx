import { db } from "@/lib/db";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProductsClient
      products={products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? "",
        status: p.status,
        icp: p.icp ?? "",
        targetKeywords: p.targetKeywords ?? [],
        targetSubreddits: p.targetSubreddits ?? [],
        valueProp: p.valueProp ?? "",
        freeTierHook: p.freeTierHook ?? "",
        prodUrl: p.prodUrl ?? "",
        groqKey: p.groqKey ?? "",
        telegramChatId: p.telegramChatId ?? "",
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
