import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const SCOPES = "read_orders,read_products";

/**
 * Initiate Shopify OAuth. Generates a random `state` stored in an HttpOnly
 * cookie so the callback can verify it and defend against CSRF.
 */
export async function GET() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;

  if (!storeDomain || !clientId) {
    return new NextResponse(
      "<html><body style='font-family:system-ui;padding:32px;background:#0a0a0a;color:#fafafa'><h1>Shopify not configured</h1><p>Set SHOPIFY_STORE_DOMAIN and SHOPIFY_CLIENT_ID in your environment.</p></body></html>",
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${baseUrl}/api/auth/shopify/callback`;

  const state = randomBytes(16).toString("hex");
  cookies().set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  const url =
    `https://${storeDomain}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(url);
}
