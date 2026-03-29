import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchShopifyTopProducts } from "@/lib/integrations/shopify";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try Shopify first
  const shopifyProducts = await fetchShopifyTopProducts(30, 10);
  if (shopifyProducts && shopifyProducts.length > 0) {
    return NextResponse.json({
      products: shopifyProducts,
      source: "shopify",
    });
  }

  // Fallback: seeded DB data
  const products = await db.topProduct.findMany({
    orderBy: { revenueCents: "desc" },
    take: 10,
  });

  return NextResponse.json({
    products: products.map((p) => ({
      name: p.name,
      revenueCents: p.revenueCents,
      unitsSold: p.unitsSold,
    })),
    source: "seed",
  });
}
