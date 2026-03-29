/**
 * Shopify Admin API integration.
 *
 * Required env: SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN
 * Docs: https://shopify.dev/docs/api/admin-rest/2024-01/resources/order
 *
 * If env vars are missing, all functions return null (caller uses DB fallback).
 */

import { subDays, format } from "date-fns";

export interface ShopifySalesSummary {
  totalRevenueCents: number;
  totalOrders: number;
  aovCents: number;
  chartData: Array<{ date: string; revenueCents: number; orders: number }>;
}

export interface ShopifyProduct {
  name: string;
  revenueCents: number;
  unitsSold: number;
}

function getConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!domain || !token) return null;
  return { domain, token };
}

interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
}

async function shopifyFetch<T>(path: string, config: { domain: string; token: string }): Promise<T> {
  const url = `https://${config.domain}/admin/api/2024-01${path}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": config.token,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch sales summary from Shopify for the given period.
 * Returns null if Shopify is not configured — caller should fall back to DB.
 */
export async function fetchShopifySales(days: number): Promise<ShopifySalesSummary | null> {
  const config = getConfig();
  if (!config) return null;

  const since = subDays(new Date(), days);
  const sinceISO = since.toISOString();

  try {
    const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
      `/orders.json?status=any&created_at_min=${sinceISO}&limit=250`,
      config
    );

    const orders = data.orders;

    // Group by date for chart
    const byDate = new Map<string, { revenueCents: number; orders: number }>();
    let totalRevenueCents = 0;

    for (const order of orders) {
      const dateKey = format(new Date(order.created_at), "yyyy-MM-dd");
      const priceCents = Math.round(parseFloat(order.total_price) * 100);
      totalRevenueCents += priceCents;

      const existing = byDate.get(dateKey) ?? { revenueCents: 0, orders: 0 };
      existing.revenueCents += priceCents;
      existing.orders += 1;
      byDate.set(dateKey, existing);
    }

    const chartData = Array.from(byDate.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalOrders = orders.length;
    const aovCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

    return { totalRevenueCents, totalOrders, aovCents, chartData };
  } catch (err) {
    console.error("[shopify] fetchShopifySales error:", err);
    return null;
  }
}

/**
 * Fetch top products by revenue from Shopify.
 * Returns null if Shopify is not configured.
 */
export async function fetchShopifyTopProducts(days: number, limit: number): Promise<ShopifyProduct[] | null> {
  const config = getConfig();
  if (!config) return null;

  const since = subDays(new Date(), days);
  const sinceISO = since.toISOString();

  try {
    const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
      `/orders.json?status=any&created_at_min=${sinceISO}&limit=250`,
      config
    );

    // Aggregate by product title
    const productMap = new Map<string, { revenueCents: number; unitsSold: number }>();

    for (const order of data.orders) {
      for (const item of order.line_items) {
        const existing = productMap.get(item.title) ?? { revenueCents: 0, unitsSold: 0 };
        existing.revenueCents += Math.round(parseFloat(item.price) * 100) * item.quantity;
        existing.unitsSold += item.quantity;
        productMap.set(item.title, existing);
      }
    }

    return Array.from(productMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, limit);
  } catch (err) {
    console.error("[shopify] fetchShopifyTopProducts error:", err);
    return null;
  }
}
