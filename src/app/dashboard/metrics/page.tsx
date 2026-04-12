import { db } from "@/lib/db";
import {
  getSummary,
  getRadarStats,
  getSwarmStats,
  getCrmStats,
  getContentStats,
  getActionItems,
  periodToSince,
  type Period,
} from "@/lib/metrics-queries";
import { MetricsClient } from "@/components/metrics/metrics-client";

interface PageProps {
  searchParams: { period?: string; productId?: string };
}

export default async function MetricsPage({ searchParams }: PageProps) {
  const rawPeriod = searchParams.period ?? "30d";
  const period: Period =
    rawPeriod === "7d" || rawPeriod === "90d" ? rawPeriod : "30d";

  const productId =
    searchParams.productId && searchParams.productId !== "all"
      ? searchParams.productId
      : null;

  const since = periodToSince(period);

  const [products, summary, radar, swarm, crm, content, actions] =
    await Promise.all([
      db.product.findMany({
        where: { status: { in: ["active", "launched"] } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      getSummary({ productId, since }),
      getRadarStats({ productId, since }),
      getSwarmStats({ productId, since }),
      getCrmStats({ productId, since }),
      getContentStats({ productId, since }),
      getActionItems({ productId }),
    ]);

  return (
    <MetricsClient
      products={products}
      period={period}
      productId={productId}
      summary={summary}
      radar={radar}
      swarm={swarm}
      crm={crm}
      content={content}
      actions={actions}
    />
  );
}
