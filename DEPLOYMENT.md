# LaunchForge — Railway Deployment Checklist

This doc lists every service you need to create in the Railway dashboard for the full LaunchForge v1 stack. All services deploy from the same GitHub repo (`AdhamHashish2003/sinai-dashboard`), each from a different **Root Directory**.

## Services overview

| # | Service | Type | Root Dir | Cron | Env vars |
|---|---------|------|----------|------|----------|
| 1 | `launchforge-web` | Web | `/` (repo root) | — | `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GHOSTCREW_API_URL`, `GHOSTCREW_API_KEY`, `PERMITAI_BASE_URL`, `PERMITAI_AUTH_TOKEN`, `TELEGRAM_BOT_TOKEN` |
| 2 | `launchforge-radar` | Cron | `workers/radar` | `*/30 * * * *` | `DATABASE_URL`, `GROQ_API_KEY` |
| 3 | `launchforge-swarm` | Cron | `workers/swarm` | `*/2 * * * *` | `DATABASE_URL`, `GROQ_API_KEY`, `TELEGRAM_BOT_TOKEN` |
| 4 | `launchforge-content` | Cron | `workers/content` | `0 14 * * *` (7am PDT daily) | `DATABASE_URL`, `GROQ_API_KEY`, `TELEGRAM_BOT_TOKEN`, `PERMITAI_BASE_URL`, `PERMITAI_AUTH_TOKEN` |
| 5 | `launchforge-metrics-daily` | Cron | `workers/metrics` | `0 15 * * *` (8am PDT daily) | `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `DASHBOARD_URL` |
| 6 | `launchforge-metrics-weekly` | Cron | `workers/metrics` | `0 15 * * 1` (Monday 8am PDT) | `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `DASHBOARD_URL` — same service can be split per cron, or use `--mode weekly` start command override |

All 6 services share the **same Postgres database** (`DATABASE_URL`). Railway's "Add variable from another service → Postgres → DATABASE_URL" is the easiest wire-up.

---

## Step-by-step dashboard instructions

### 1. Main Next.js web service (already deployed)

Already live at `https://sinai-dashboard-production.up.railway.app`. Verify env vars:

```
DATABASE_URL                  # Railway Postgres (link from DB service)
NEXTAUTH_SECRET               # already set
NEXTAUTH_URL                  # = production URL
GHOSTCREW_API_URL             # https://ghostcrew-production.up.railway.app
GHOSTCREW_API_KEY             # your bearer token for X-API-Key header
PERMITAI_BASE_URL             # https://permit-agent-production-1731.up.railway.app
PERMITAI_AUTH_TOKEN           # (optional) unlocks PDF generation; leave empty for text-only
TELEGRAM_BOT_TOKEN            # your Grammy/GhostCrew bot token
```

### 2. Radar cron service

1. Railway dashboard → Project → **+ New → GitHub Repo** → select `AdhamHashish2003/sinai-dashboard`
2. Service name: `launchforge-radar`
3. **Settings → Source → Root Directory**: `workers/radar`
4. **Settings → Deploy → Cron Schedule**: `*/30 * * * *`
5. **Variables**:
   - `DATABASE_URL` — link from Postgres service (Add reference)
   - `GROQ_API_KEY` — your Groq key (scoring uses llama-3.3-70b-versatile)
6. Deploy. First run happens at the next :00 or :30 of the hour.

### 3. Swarm cron service

1. **+ New → GitHub Repo** → same repo
2. Service name: `launchforge-swarm`
3. **Root Directory**: `workers/swarm`
4. **Cron Schedule**: `*/2 * * * *`
5. **Variables**:
   - `DATABASE_URL` (link from Postgres)
   - `GROQ_API_KEY` (drafting uses llama-3.3-70b-versatile)
   - `TELEGRAM_BOT_TOKEN` (same as GhostCrew bot)

### 4. Content Flywheel cron service

1. **+ New → GitHub Repo** → same repo
2. Service name: `launchforge-content`
3. **Root Directory**: `workers/content`
4. **Cron Schedule**: `0 14 * * *` (= 7am PDT / 6am PST — cron doesn't track DST, accept the 1h drift)
5. **Variables**:
   - `DATABASE_URL` (link from Postgres)
   - `GROQ_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `PERMITAI_BASE_URL` = `https://permit-agent-production-1731.up.railway.app`
   - `PERMITAI_AUTH_TOKEN` (optional — leave empty for text-only v1 until you grab a token from `/api/auth/login`)

### 5. Metrics Digest — daily

1. **+ New → GitHub Repo** → same repo
2. Service name: `launchforge-metrics-daily`
3. **Root Directory**: `workers/metrics`
4. **Cron Schedule**: `0 15 * * *` (= 8am PDT / 7am PST)
5. **Start Command**: `python main.py` (default — daily mode)
6. **Variables**:
   - `DATABASE_URL` (link from Postgres)
   - `TELEGRAM_BOT_TOKEN`
   - `DASHBOARD_URL` = `https://sinai-dashboard-production.up.railway.app`

### 6. Metrics Digest — weekly

1. **+ New → GitHub Repo** → same repo
2. Service name: `launchforge-metrics-weekly`
3. **Root Directory**: `workers/metrics`
4. **Cron Schedule**: `0 15 * * 1` (= Monday 8am PDT)
5. **Start Command**: **override to** `python main.py --mode weekly`
6. **Variables**: same as daily

> **If Railway's cron service type doesn't allow overriding the start command**, you can instead run a single service with `python main.py` and add a branch inside `workers/metrics/main.py` that checks `dt.datetime.utcnow().weekday() == 0` to switch modes. For now, two services is simpler.

---

## Critical cross-service config

**PermitAI's `telegramChatId` must be set on the Product row** for Telegram pushes to actually arrive. After first deploy, connect to Postgres and run:

```sql
UPDATE "Product" SET "telegramChatId" = '<your-telegram-chat-id>'
WHERE slug = 'permit-ai';
```

Your chat ID is the integer Telegram uses for your user (you can find it by messaging `@userinfobot` on Telegram).

**PermitAI status must be `active`** for workers to pick it up:

```sql
SELECT slug, status FROM "Product";
-- PermitAI should show status = 'active'
-- If not: UPDATE "Product" SET status = 'active' WHERE slug = 'permit-ai';
```

---

## Verification curls

After all services are deployed, run from any terminal:

```bash
# 1. Landing page
curl -s -o /dev/null -w "%{http_code}\n" https://sinai-dashboard-production.up.railway.app/

# 2. All 7 top-level dashboard routes
for path in products radar swarm crm content seo metrics; do
  echo -n "dashboard/$path: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://sinai-dashboard-production.up.railway.app/dashboard/$path
done

# 3. Metrics sub-pages
for path in saas instagram analytics; do
  echo -n "dashboard/metrics/$path: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://sinai-dashboard-production.up.railway.app/dashboard/metrics/$path
done
```

Expected: `200` on root (landing), `307` or `200` on dashboard routes (auth-gated redirects are fine).

---

## Manual smoke test (one-shot runs against production DB)

Use these locally to verify each worker produces real results before trusting crons:

```bash
# Copy the Railway Postgres URL and your API keys into your shell first.
export DATABASE_URL='<production-postgres-url-from-railway>'
export GROQ_API_KEY='<your-groq-key>'
export TELEGRAM_BOT_TOKEN='<your-telegram-bot-token>'
export PERMITAI_BASE_URL='https://permit-agent-production-1731.up.railway.app'
export DASHBOARD_URL='https://sinai-dashboard-production.up.railway.app'

# Install deps for each worker (once per worker)
cd workers/radar && pip install -r requirements.txt && cd ../..
cd workers/swarm && pip install -r requirements.txt && cd ../..
cd workers/content && pip install -r requirements.txt && cd ../..
cd workers/metrics && pip install -r requirements.txt && cd ../..

# Radar — expect 5-20 signals saved after first run
cd workers/radar && python main.py --once && cd ../..

# Swarm — only does work if a radar signal is in status=ready_to_draft.
# Trigger one from the UI first: /dashboard/radar → click "Draft Reply" on any signal.
cd workers/swarm && python main.py --once && cd ../..

# Content Flywheel — forces a city_report for PermitAI
cd workers/content && python main.py --product-slug permit-ai --post-type city_report && cd ../..

# Metrics digest — daily mode
cd workers/metrics && python main.py --once && cd ../..
```

Success criteria per worker:
- **Radar**: prints `saved N signals to DB` where N ≥ 1
- **Swarm**: prints `saved draft, status → ready_to_post` (requires a pending_draft row to exist)
- **Content**: prints `saved ProofPost <id>` (requires PermitAI `status='active'` and `GROQ_API_KEY` env var or `groqKey` on Product)
- **Metrics**: prints `telegram: sent` if chatId+token are set, or `telegram: skipped` otherwise

---

## Final production URLs

Once deployed, these should all work:

- Landing: https://sinai-dashboard-production.up.railway.app/
- Products: https://sinai-dashboard-production.up.railway.app/dashboard/products
- Radar: https://sinai-dashboard-production.up.railway.app/dashboard/radar
- Swarm: https://sinai-dashboard-production.up.railway.app/dashboard/swarm
- CRM: https://sinai-dashboard-production.up.railway.app/dashboard/crm
- Content: https://sinai-dashboard-production.up.railway.app/dashboard/content
- SEO (placeholder): https://sinai-dashboard-production.up.railway.app/dashboard/seo
- Metrics (unified): https://sinai-dashboard-production.up.railway.app/dashboard/metrics
- Metrics → SaaS: https://sinai-dashboard-production.up.railway.app/dashboard/metrics/saas
- Metrics → Instagram: https://sinai-dashboard-production.up.railway.app/dashboard/metrics/instagram
- Metrics → Analytics: https://sinai-dashboard-production.up.railway.app/dashboard/metrics/analytics
