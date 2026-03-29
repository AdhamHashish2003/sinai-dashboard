import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN || "sands-new.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "eeb8b01d9238269852b65dd6cc3a54e4";
const SCOPES = "read_orders,read_products";
const REDIRECT_URI = `${process.env.NEXTAUTH_URL || "http://localhost:3002"}/api/auth/shopify/callback`;

export async function GET() {
  const url = `https://${SHOPIFY_STORE}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  return NextResponse.redirect(url);
}
