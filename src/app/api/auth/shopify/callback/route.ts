import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Shopify OAuth callback.
 *
 * - Validates `state` cookie to defend against CSRF.
 * - Exchanges `code` for an access token via Shopify.
 * - Does NOT render the token to the browser.
 * - Does NOT write secrets to the filesystem (fails on read-only runtimes
 *   like Railway / Vercel, and leaks secrets into container volumes).
 *
 * The token is returned in an HttpOnly cookie that subsequent server-side
 * handlers can read to call Shopify on behalf of the user. For permanent
 * store-wide tokens, copy the value from logs on first run and set
 * SHOPIFY_ACCESS_TOKEN in your env store (Railway / Vercel).
 */

function errorPage(title: string, body: string, status = 500) {
  return new NextResponse(
    `<html><body style="font-family:system-ui;padding:32px;background:#0a0a0a;color:#fafafa"><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!storeDomain || !clientId || !clientSecret) {
    return errorPage(
      "Shopify not configured",
      "Set SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET in your environment."
    );
  }

  if (!code) return errorPage("Error", "No code parameter received.", 400);

  // ── CSRF: verify state matches the cookie set on /api/auth/shopify ─────────
  const jar = cookies();
  const expectedState = jar.get("shopify_oauth_state")?.value;
  jar.delete("shopify_oauth_state");
  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return errorPage(
      "Invalid state",
      "OAuth state mismatch — possible CSRF. Start the flow again.",
      400
    );
  }

  // ── Exchange code for access token ─────────────────────────────────────────
  const tokenRes = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    console.error("[shopify] token exchange failed:", tokenRes.status, errorText);
    return errorPage("Token exchange failed", `Status ${tokenRes.status}. See server logs.`, 500);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; scope: string };

  // Store token in an HttpOnly cookie — visible to server code only.
  jar.set("shopify_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Log to server so an operator can copy into env if they want persistence.
  console.log("[shopify] OAuth succeeded — set SHOPIFY_ACCESS_TOKEN in env to persist across sessions.");

  return new NextResponse(
    `<html>
<head><title>Shopify Connected</title><style>
  body { font-family: system-ui; background: #0a0a0a; color: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 32px; max-width: 500px; width: 100%; }
  h1 { color: #34d399; font-size: 24px; margin: 0 0 8px; }
  p { color: #a1a1aa; font-size: 14px; margin: 4px 0; }
  code { background: #1e1e1e; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #fafafa; }
  .scope { color: #818cf8; }
  .note { color: #737373; font-size: 12px; margin-top: 16px; }
</style></head>
<body>
  <div class="card">
    <h1>Shopify Connected</h1>
    <p>Store: <code>${storeDomain}</code></p>
    <p>Scopes: <span class="scope">${tokenData.scope}</span></p>
    <p class="note">Token stored in an HttpOnly cookie for this session. For permanent use across deploys, set <code>SHOPIFY_ACCESS_TOKEN</code> in your Railway/Vercel environment — check server logs for instructions.</p>
  </div>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
