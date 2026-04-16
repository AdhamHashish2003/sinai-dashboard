# Bug Triage — Sinai Dashboard

Scan run: 2026-04-15. Scope: production deployment at `sinai-dashboard-production.up.railway.app` + static code review of `src/`.

## Priority legend
- 🔴 P0 — security / data-loss / breaks prod
- 🟠 P1 — functional regression or confusing UX
- 🟡 P2 — polish / tech debt / cosmetic

---

## 🔴 P0 bugs

### 1. Shopify OAuth callback renders access token in HTML response
`src/app/api/auth/shopify/callback/route.ts:94`

The raw access token is embedded in the HTML success page (visible to anyone who triggers the flow, logged by referrers, and landable in browser history / extensions). Also written to `.shopify-token` on disk and persisted into `.env.local` — which fails silently on Railway's read-only filesystem and on any serverless runtime.

**Fix:** Remove token from HTML, remove filesystem writes, return a confirmation only. Real token persistence must go through env vars or a dedicated secrets store.

### 2. Hardcoded Shopify Client ID + store domain in source
`src/app/api/auth/shopify/route.ts:3-4`, `callback/route.ts:5-6`
```ts
const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN || "sands-new.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "eeb8b01d9238269852b65dd6cc3a54e4";
```
Production credentials committed to git. Client IDs aren't fully secret but this still leaks infra details and couples the repo to one specific Shopify store.

**Fix:** Require env vars; refuse to start the flow if missing.

### 3. Shopify OAuth flow has no `state` parameter (CSRF)
`src/app/api/auth/shopify/route.ts:9`

OAuth spec requires a random `state` set in the authorize URL and verified in the callback. Missing → CSRF attackers can hand-craft callbacks that link their store's token to the victim's session.

**Fix:** Generate a random `state`, store in an HttpOnly cookie, verify in callback.

### 4. Dev credentials provider enabled in production
`src/lib/auth.ts:15-32`

The "Dev Login" button creates/returns a hardcoded `dev@sinai.local` user with NO password check on every environment. Verified live: on production I was logged in automatically as "Dev User" with full dashboard access.

**Fix:** Gate `CredentialsProvider` behind `process.env.NODE_ENV !== "production"` (and/or a feature flag).

### 5. Second `PrismaClient` instantiated in refresh-engine
`src/lib/refresh-engine.ts:18`

```ts
const db = globalForDb.refreshDb ?? new PrismaClient();
```
Creates a parallel connection pool to the one in `src/lib/db.ts`. In dev with HMR, plus the socket.io server calling `startRefreshEngine()`, this compounds — each hot reload can leak a pool. On Railway with a Postgres connection cap, this is a slow-burn connection exhaustion.

**Fix:** Import the singleton `db` from `@/lib/db`.

---

## 🟠 P1 bugs

### 6. Dashboard nav highlights "Content" when on `/dashboard/content-farm`
`src/components/dashboard/nav.tsx:84`

```ts
const isActive = pathname.startsWith(link.href);
```
`"/dashboard/content-farm".startsWith("/dashboard/content")` → `true`. Visiting Content Farm lights up the Content tab — wrong page appears active.

**Fix:** Require either exact match or the next char after `link.href` to be `/` or end.

### 7. Webhook secret check bypassable when env is empty string
`src/app/api/webhooks/saas/route.ts:14`

```ts
if (secret !== process.env.WEBHOOK_SECRET) { return 403 }
```
If `WEBHOOK_SECRET=""` or unset, the comparison `undefined !== undefined` is false (undefined case) but `"" !== ""` is false → any request with header absent (and env undefined) OR empty header + empty env passes.

**Fix:** Reject immediately if `WEBHOOK_SECRET` is falsy.

### 8. `.env.example` missing `GOOGLE_MAPS_API_KEY`
`.env.example` + `src/app/api/scout/run/route.ts:90`

The Scout flow depends on `GOOGLE_MAPS_API_KEY`, but `.env.example` only lists `GOOGLE_API_KEY` (used by YouTube). New engineers copying the template will never set the Maps key and Scout breaks silently.

**Fix:** Add `GOOGLE_MAPS_API_KEY=` to `.env.example` with comment.

### 9. Shopify route falls back to `localhost:3002`
`src/app/api/auth/shopify/route.ts:6`

`"http://localhost:3002"` fallback — but `next dev` defaults to port 3000 (verified in package.json script, and launch.json port 3000). Developers without `NEXTAUTH_URL` set will get a callback that can't resolve.

**Fix:** Fall back to `http://localhost:3000` OR throw when unset.

---

## 🟡 P2 bugs

### 10. Instagram API: raw response logged to stdout on every fetch
`src/lib/integrations/instagram.ts:59`

`console.log(... JSON.stringify(json, null, 2))` spams Railway logs with every refresh. Was likely a debug line left behind.

**Fix:** Remove.

### 11. `@undercurrenthq` shows `engagementRate: 4.8%` from a follower-count formula
`src/lib/integrations/instagram.ts:76-78`

Engagement is computed as `5000/√followers` clamped to [1, 10]. This is fabricated — it's not engagement, it's a function of follower count. Users see a metric that looks real but is synthetic.

**Fix:** Return 0 (or `null`) when real engagement data is unavailable; document the placeholder.

### 12. `growthPct30d` label doesn't match the computation
`src/app/api/dashboard/content-farm/route.ts:37-41`

`oldestMetric` is `metrics[length-1]` where `metrics` is capped at `take: 30` with `orderBy date desc`. So "oldest" is only the oldest of the last 30 records — if metrics are stored multiple times per day, this can span far less than 30 days.

**Fix:** Query one metric from 30 days ago explicitly (e.g. `where: { date: { lte: 30daysago } }, orderBy desc, take 1`).

### 13. `SEO` tab shows only "Coming soon"
`src/app/dashboard/seo/page.tsx`

Not a bug per se, but the navbar advertises a feature that doesn't exist. Consider hiding until ready.

---

## Observations that are NOT bugs (for the record)

- `/dashboard/content-farm` and `/dashboard/metrics/instagram` rendering the same page — intentional re-export (`export { default } from ...`). Navigation works.
- `/dashboard/analytics` and `/dashboard/metrics/analytics` — same pattern, intentional.
- `Math.random()` in `src/app/api/radar/run/route.ts:85` — used to rotate subreddits, not a bug.
