/**
 * Shopify Admin API integration stub.
 *
 * Required env: SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_TOKEN
 * Docs: https://shopify.dev/docs/api/admin-rest
 */

export interface ShopifySalesSummary {
  totalRevenueCents: number;
  totalOrders: number;
  aovCents: number;
  period: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  revenueCents: number;
  unitsSold: number;
}

/**
 * Fetch sales summary for a date range.
 * TODO: Replace with real Shopify Admin API call.
 * Endpoint: GET /admin/api/2024-01/orders.json?status=any&created_at_min=...
 */
export async function fetchSalesSummary(_days: number): Promise<ShopifySalesSummary> {
  // TODO: Implement using SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_API_TOKEN
  return { totalRevenueCents: 0, totalOrders: 0, aovCents: 0, period: "30d" };
}

/**
 * Fetch top products by revenue.
 * TODO: Replace with real API call.
 */
export async function fetchTopProducts(_limit: number): Promise<ShopifyProduct[]> {
  // TODO: Implement real API call
  return [];
}
