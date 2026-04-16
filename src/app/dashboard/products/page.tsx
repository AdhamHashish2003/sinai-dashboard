import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductsClient, type ProductHealth } from "@/components/products/products-client";

export default async function ProductsPage() {
  // The dashboard layout also guards, but server components here run in
  // parallel with the layout — an unauthed request can fire DB queries
  // before the layout's redirect resolves. Explicit guard prevents that.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Pull the numbers we need to show a per-product "is it alive?" strip.
  // We query in parallel rather than per-card in the client — less chatter,
  // no loading spinners, RSC renders the whole page cohesively.
  const health: Record<string, ProductHealth> = {};
  await Promise.all(
    products.map(async (product) => {
      const [signalsLast24h, lastSignal, lastLead, lastScoutJob, lastProofPost] =
        await Promise.all([
          db.signal.count({
            where: { productId: product.id, createdAt: { gte: oneDayAgo } },
          }),
          db.signal.findFirst({
            where: { productId: product.id },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
          db.lead.findFirst({
            where: { productId: product.id },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
          db.scoutJob.findFirst({
            where: { productId: product.id, status: "done" },
            orderBy: { completedAt: "desc" },
            select: { completedAt: true, resultsCount: true },
          }),
          db.proofPost.findFirst({
            where: { productId: product.id },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ]);

      health[product.id] = {
        signalsLast24h,
        lastSignalAt: lastSignal?.createdAt.toISOString() ?? null,
        lastLeadAt: lastLead?.createdAt.toISOString() ?? null,
        lastScoutAt: lastScoutJob?.completedAt?.toISOString() ?? null,
        lastScoutResults: lastScoutJob?.resultsCount ?? 0,
        lastContentAt: lastProofPost?.createdAt.toISOString() ?? null,
      };
    })
  );

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
      health={health}
    />
  );
}
