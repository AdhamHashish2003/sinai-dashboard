# Sinai Dashboard (aka LaunchForge)

A multi-product operator dashboard. **Two systems in one repo** sharing one Postgres:

1. **Next.js 14 web app** (this is what the user sees at `dashboard.*`)
2. **5 Python cron workers** under `workers/` that scrape, score, draft, and notify

When asked to "fix the dashboard", the user almost always means the Next.js app. When they mention Radar / Swarm / Content / Metrics / CRM, that's a worker.

---

## Quick Start

```bash
# 1. Install
npm install                    # also runs prisma generate via postinstall

# 2. Start Postgres (runs on host port 5433 → container 5432)
docker-compose up -d

# 3. Set up DB
npx prisma db push             # for schema-first dev (no migrations)
# or: npx prisma migrate dev   # for migration-tracked dev
npm run db:seed                # loads sample SaaS metrics, social, analytics

# 4. Dev server
npm run dev                    # default Next.js port is 3000
# README mentions 3002 — that's from an older config; dev defaults to 3000
```

**Tests:** `jest.config.ts` is configured but there's no `"test"` script in `package.json`. Run with `npx jest` directly.

**Lint:** `npm run lint` (next lint).

---

## Architecture Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    Postgres (shared)                             │
│  Products · Signals · Replies · Leads · ProofPosts · SaaS/Social │
│  Connections · WebhookEvents · KeywordRankings · SalesOrder ...  │
└─────────────────────────────────────────────────────────────────┘
         ▲                                        ▲
         │ Prisma                                 │ asyncpg / psycopg
         │                                        │
┌────────┴──────────────┐              ┌──────────┴─────────────┐
│ Next.js 14 App Router │              │  Python workers (cron) │
│ src/                  │              │  workers/              │
│  app/dashboard/*      │              │  ├─ radar/   */30 min  │
│  app/api/*            │◄─ Socket.IO ─┤  ├─ swarm/   */2 min   │
│  components/widgets/* │              │  ├─ content/ 1x/day    │
│  lib/metrics-queries  │              │  ├─ metrics/ 1x/day    │
│  hooks/useRealtime    │              │  └─ crm/    on-demand  │
└───────────────────────┘              └────────────────────────┘
```

### Web routes (`src/app/`)

| Route | Purpose |
|-------|---------|
| `/` | Landing page (particle bg) |
| `/dashboard` | SaaS metrics home (MRR, active users, webhooks, keywords, content cal) |
| `/dashboard/analytics` | Page views, traffic sources, SEO, sales, funnel, top products |
| `/dashboard/products` | Multi-tenant Product list |
| `/dashboard/radar` | Reddit/HN signals queue |
| `/dashboard/swarm` | Reply drafts awaiting review |
| `/dashboard/crm` | Leads + Scout jobs |
| `/dashboard/content` | ProofPost flywheel |
| `/dashboard/content-farm` | Social account grid |
| `/dashboard/connections` | Auto-linking config (30-min refresh) |
| `/dashboard/metrics/{saas,instagram,analytics}` | Sub-dashboards |
| `/dashboard/seo` | Placeholder |

### API routes (`src/app/api/`)

Each subdirectory owns a domain: `auth/`, `dashboard/`, `connections/`, `content/`, `leads/`, `metrics/`, `products/`, `radar/`, `replies/`, `scout/`, `signals/`, `swarm/`, `webhooks/`, `health/`.

`src/pages/api/socket.ts` is the Socket.IO endpoint (pages router, not app router — required by socket.io-client).

### Workers (`workers/*`)

Each is a standalone Python package with its own `Dockerfile`, `requirements.txt`, `main.py`, `db.py`. Deployed as separate Railway services — see `DEPLOYMENT.md` for cron schedules and env vars.

| Worker | Schedule | Purpose |
|--------|----------|---------|
| `radar/` | `*/30 * * * *` | Scrape Reddit+HN → score with Groq Llama 3.3 → save signals with score ≥ 7 |
| `swarm/` | `*/2 * * * *` | Draft replies for `Reply.status='pending_draft'` → Telegram push |
| `content/` | `0 14 * * *` (7am PDT) | Generate ProofPosts per active Product |
| `metrics/` | `0 15 * * *` daily + `0 15 * * 1` weekly | Digest → Telegram |
| `crm/` | on-demand | Scout client calls GhostCrew API for lead enrichment |

**Run a worker locally (smoke test):**
```bash
cd workers/radar
pip install -r requirements.txt
DATABASE_URL='...' GROQ_API_KEY='...' python main.py --once
```

The `--once` flag is accepted as a no-op on `radar` and `swarm` for CLI consistency — they always run one pass and exit (crons).

---

## Data model gotchas

- **`Product`** is the multi-tenant root. Radar/Swarm/Content/CRM all scope by `productId`. `status='active'` must be set for workers to pick up a product.
- **`Signal` → `Reply`** is 1:1 (`@unique` on `signalId`). `Reply.status='pending_draft'` is the swarm worker's trigger.
- **Regeneration hint:** When a user clicks "Regenerate" in the swarm UI, the hint is stored in `Reply.notes` prefixed with `regenerate:`. The worker parses this out.
- **Unique constraints to know:** `Signal(productId, sourceUrl)`, `Lead(productId, sourceUrl)`, `Connection(platform, username)`, most date-indexed tables have `@@unique([date])`.
- **`ProofPost.draftVersions`** is a JSON array `[{body, createdAt, note?}]` — append-only. Same pattern on `Reply.draftVersions`.
- **Telegram chat IDs** live on the `Product` row (`telegramChatId`). PermitAI specifically must have this set or all Telegram pushes silently skip — see `DEPLOYMENT.md` "Critical cross-service config".

---

## Key files (entry points)

| Path | Purpose |
|------|---------|
| `src/lib/db.ts` | Prisma client singleton (hot-reload safe) |
| `src/lib/auth.ts` | NextAuth config (GitHub + dev credentials) |
| `src/lib/env.ts` | Zod-validated env with Vercel fallback |
| `src/lib/metrics-queries.ts` | All dashboard data queries (10K chars — heavy file) |
| `src/lib/refresh-engine.ts` | 30-min auto-refresh for `Connection` rows |
| `src/lib/integrations/` | API client stubs for Instagram, TikTok, Shopify, GA4, GSC, YouTube |
| `src/lib/groq.ts`, `reddit.ts`, `ghostcrew.ts` | External API wrappers |
| `src/types/dashboard.ts` | All shared TS interfaces |
| `src/hooks/useRealtimeData.ts` | Socket.IO with polling fallback |
| `src/components/dashboard/widgets/` | 12+ widget components (MRR chart, social growth, etc.) |
| `src/components/dashboard/widget-grid.tsx` | dnd-kit sortable grid; order persists in `localStorage` |
| `prisma/schema.prisma` | 25+ models, all above |
| `prisma/seed.ts` | Sample data (12K — not trivial, reference for data shape) |
| `src/app/dashboard/launches/new/` | Launch Wizard — paragraph → full Product config |
| `src/app/api/launches/*`           | Wizard API (ai-fill + commit) |

---

## External services & env vars

| Var | Used by | Required |
|-----|---------|----------|
| `DATABASE_URL` | All | Yes (shared Postgres) |
| `NEXTAUTH_SECRET` | Web | Yes |
| `NEXTAUTH_URL` | Web | Auto-derived from `VERCEL_URL` if unset |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Web | Prod only |
| `WEBHOOK_SECRET` | `/api/webhooks/saas` | Optional |
| `GROQ_API_KEY` | `radar`, `swarm`, `content` | Yes for those workers |
| `TELEGRAM_BOT_TOKEN` | `swarm`, `content`, `metrics` | Yes (or pushes silently skip) |
| `GHOSTCREW_API_URL` / `GHOSTCREW_API_KEY` | `crm/scout_client.py` + `/api/scout` | Yes for Scout |
| `PERMITAI_BASE_URL` / `PERMITAI_AUTH_TOKEN` | `content` worker | Token optional (text-only without) |
| `RAPIDAPI_KEY` | Instagram scraping | Yes for that integration |
| `GOOGLE_API_KEY` | YouTube | Yes for that integration |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ACCESS_TOKEN` | Shopify integration | Yes for that |
| `GA4_PROPERTY_ID` / `GOOGLE_SERVICE_ACCOUNT_KEY` | GA4 integration | Yes for that |
| `DASHBOARD_URL` | `metrics` worker | Yes (link-back in digest) |

See `.env.example` for the template. Most integrations gracefully no-op when unset.

---

## next.config.mjs quirk (important)

There's a **rewrite fallback** at the Next config level:

```js
fallback: [
  { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }
]
```

Any `/api/*` request that doesn't match a local Next.js route gets proxied to `localhost:8000`. This means:
- If you add a new API route and it returns 404 or hangs in dev, check whether it's unknowingly being proxied to a Python backend.
- Production deploys expect no backend at 8000 — the fallback returns a connection error silently.

---

## Launch Wizard

Turn a freeform paragraph into a fully configured Product row.

- UI: `/dashboard/launches/new`
- Endpoints: `POST /api/launches/ai-fill` (returns a draft, no persist) and `POST /api/launches` (commits)
- Shared Zod schema: `src/types/launch.ts`
- LLM: Groq `llama-3.3-70b-versatile` with JSON mode, `temperature: 0.3`
- Fields it fills on `Product`: existing `name/slug/tagline/icp/valueProp/freeTierHook/targetSubreddits/targetKeywords` + new `scoutState/scoutCities/scoutQueries/contentPostTypes/contentTopics/launchedAt/launchSeed/launchModel`
- Scout route (`src/app/api/scout/run/route.ts`) prefers `product.scoutQueries` / `scoutCities` / `scoutState` when set, falling back to hardcoded `QUERIES` / `CITIES` / request `state` for backwards compat with PermitAI.

Typical launch: paste paragraph → click "Fill with AI" → review 4 collapsible sections → click "Launch" → redirected to `/dashboard/radar?product=<id>`. Total time ~15 seconds.

---

## Conventions observed

- **Widgets** are self-contained in `src/components/dashboard/widgets/*`. Each fetches its own data via React Query. Add a new one → register it in `widget-grid.tsx`.
- **Dashboard queries** go in `src/lib/metrics-queries.ts` (not per-route). API routes call into this.
- **Prisma client** always imported from `@/lib/db` — never instantiate directly (hot-reload leak).
- **Zod schemas** for all env + webhook payload validation.
- **Dark mode** via `next-themes`; charts and UI check `useTheme()` directly.
- **Widget order persists in localStorage** — this is by design, not a DB write.

---

## Deployment

Railway. 6 services, all from the same repo at different Root Directories. See `DEPLOYMENT.md` for the full checklist. Vercel is supported too (config in `vercel.json`), but the workers need to run somewhere cron-friendly.

Build:
```bash
npm run build    # runs `prisma generate && next build` (standalone output)
```

Railway uses `Procfile` / `railway.toml`. The worker `Dockerfile`s are thin Python 3.11-alpine with `pip install -r requirements.txt`.

---

## Known gotchas

1. **`.claude/launch.json`** previously had Windows paths — fixed. If it regresses, update `runtimeExecutable` to `npm` and `runtimeArgs` to `["run", "dev"]`.
2. **README.md says port 3002**, actual `next dev` default is 3000. Either the README is stale or the user needs a `-p 3002` flag.
3. **Docker Postgres maps host 5433 → container 5432.** Connection strings must use `:5433`.
4. **Socket.IO uses the pages router** (`src/pages/api/socket.ts`), not app router — don't move it.
5. **Groq rate limit** in swarm: 5 drafts/min → 12s sleep between calls (hardcoded `RATE_LIMIT_DELAY = 12`).
6. **Recent migrations in `prisma/migrations/`** — always run `prisma db push` or `prisma migrate dev` after pulling.
7. **Scout migration (April 2026):** Dropped YellowPages entirely → Google Places API only. See commits `4452867`, `cc80b31`, `84858be`, `53107e2`. Custom search queries + surfaced errors in last commit.
8. **Ship Inspector Grade A fixes:** Commit `006c05f` landed 7 bug fixes. When debugging, check that commit before reintroducing fixed issues.

---

## Useful commands reference

```bash
# DB inspection
npx prisma studio                        # GUI at localhost:5555
npx prisma db pull                       # reverse-engineer schema from DB

# Worker smoke tests (requires env vars)
cd workers/radar   && python main.py --once
cd workers/swarm   && python main.py --once
cd workers/content && python main.py --product-slug permit-ai --post-type city_report
cd workers/metrics && python main.py --once
cd workers/metrics && python main.py --mode weekly

# Scout CLI (CRM lead fetch)
cd workers/crm && python scout_client.py permit-ai cslb_adu_builders CA 50

# Production health checks
for path in products radar swarm crm content seo metrics; do
  curl -s -o /dev/null -w "$path: %{http_code}\n" \
    https://sinai-dashboard-production.up.railway.app/dashboard/$path
done
```

---

## Related docs

- `README.md` — user-facing quick start
- `DEPLOYMENT.md` — Railway service-by-service deploy checklist
- `.env.example` — env var template
- `.promptforge_state.md` — historical build notes (probably stale)
