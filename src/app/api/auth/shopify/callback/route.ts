import { NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const SHOPIFY_STORE = "sands-new.myshopify.com";
const CLIENT_ID = "eeb8b01d9238269852b65dd6cc3a54e4";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(
      "<html><body><h1>Error</h1><p>No code parameter received from Shopify.</p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    return new NextResponse(
      "<html><body><h1>Error</h1><p>SHOPIFY_CLIENT_SECRET is not set in environment variables. Add it to .env.local and restart the dev server.</p></body></html>",
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    return new NextResponse(
      `<html><body><h1>Token Exchange Failed</h1><p>Status: ${tokenRes.status}</p><pre>${errorText}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  const tokenData = await tokenRes.json() as { access_token: string; scope: string };
  const accessToken = tokenData.access_token;

  // Save to .shopify-token file
  const projectRoot = process.cwd();
  const tokenFilePath = join(projectRoot, ".shopify-token");
  writeFileSync(tokenFilePath, accessToken, "utf-8");

  // Append/update SHOPIFY_ACCESS_TOKEN and SHOPIFY_STORE_DOMAIN in .env.local
  const envPath = join(projectRoot, ".env.local");
  let envContent = "";
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
  }

  // Update or append SHOPIFY_ACCESS_TOKEN
  if (envContent.includes("SHOPIFY_ACCESS_TOKEN=")) {
    envContent = envContent.replace(/SHOPIFY_ACCESS_TOKEN=.*/g, `SHOPIFY_ACCESS_TOKEN=${accessToken}`);
  } else {
    envContent += `\n# Shopify (auto-configured via OAuth)\nSHOPIFY_ACCESS_TOKEN=${accessToken}\n`;
  }

  // Update or append SHOPIFY_STORE_DOMAIN
  if (envContent.includes("SHOPIFY_STORE_DOMAIN=")) {
    envContent = envContent.replace(/SHOPIFY_STORE_DOMAIN=.*/g, `SHOPIFY_STORE_DOMAIN=${SHOPIFY_STORE}`);
  } else {
    envContent += `SHOPIFY_STORE_DOMAIN=${SHOPIFY_STORE}\n`;
  }

  writeFileSync(envPath, envContent, "utf-8");

  return new NextResponse(
    `<html>
<head><title>Shopify Connected</title><style>
  body { font-family: system-ui; background: #0a0a0a; color: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 32px; max-width: 500px; width: 100%; }
  h1 { color: #34d399; font-size: 24px; margin: 0 0 8px; }
  p { color: #a1a1aa; font-size: 14px; margin: 4px 0; }
  code { background: #1e1e1e; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #fafafa; }
  .token { background: #1e1e1e; padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 12px; margin: 16px 0; color: #fafafa; }
  .scope { color: #818cf8; }
  .note { color: #737373; font-size: 12px; margin-top: 16px; }
</style></head>
<body>
  <div class="card">
    <h1>Shopify Connected</h1>
    <p>Store: <code>${SHOPIFY_STORE}</code></p>
    <p>Scopes: <span class="scope">${tokenData.scope}</span></p>
    <div class="token">${accessToken}</div>
    <p>Saved to <code>.shopify-token</code> and <code>.env.local</code></p>
    <p class="note">Restart your dev server for the env changes to take effect. Sales &amp; Top Products widgets will now pull live Shopify data.</p>
  </div>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
