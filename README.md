# Sinai Dashboard

A production-grade analytics dashboard combining SaaS metrics, web analytics, and content farm management in a single unified interface.

## Screenshots

<!-- Add screenshots here -->

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 15 + Prisma ORM
- **Auth**: NextAuth.js (GitHub OAuth + dev credentials)
- **Real-time**: Socket.IO with polling fallback
- **Charts**: Recharts
- **Styling**: Tailwind CSS (dark/light mode via next-themes)
- **Drag & Drop**: dnd-kit
- **Validation**: Zod
- **Data Fetching**: TanStack React Query

## Features

- **SaaS Metrics** — MRR, active users, churn, keyword rankings, webhook events, content calendar
- **Analytics** — Page views, traffic sources, SEO overview, sales/revenue, conversion funnel, top products
- **Content Farm** — Unified grid of all Instagram/TikTok accounts with follower counts, engagement rates, and recent post thumbnails
- **Connections (Auto-Linking)** — Add any social account by username; data refreshes automatically every 30 minutes
- **Dark/Light Mode** — One-click theme toggle, all charts and UI adapt
- **Drag & Drop Widgets** — Rearrange widgets freely, order persists in localStorage
- **CSV Export** — Export tabular data from keyword rankings, top products, webhook events
- **Date Range Filters** — Toggle 7d / 30d / 90d on analytics widgets

## Setup

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd sinai-dashboard
npm install

# 2. Copy env template
cp .env.example .env.local
# Edit .env.local with your values (DATABASE_URL, NEXTAUTH_SECRET are required)

# 3. Start PostgreSQL
docker-compose up -d

# 4. Setup database
npx prisma generate
npx prisma db push
npm run db:seed

# 5. Start dev server
npm run dev
# Open http://localhost:3002
# Click "Dev Login" (no GitHub OAuth needed in dev)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Session encryption key |
| `NEXTAUTH_URL` | Dev only | Auto-derived from `VERCEL_URL` in production |
| `GITHUB_CLIENT_ID` | Prod only | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Prod only | GitHub OAuth app secret |
| `WEBHOOK_SECRET` | No | Secret for validating incoming webhooks |

See `.env.example` for the full list including future integration keys.

## Deployment (Vercel)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project
vercel link

# 3. Add environment variables in Vercel dashboard:
#    - DATABASE_URL (use Neon, Supabase, or Railway for hosted Postgres)
#    - NEXTAUTH_SECRET
#    - GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET

# 4. Deploy
vercel --prod
```

The `vercel.json` is pre-configured. `NEXTAUTH_URL` is automatically derived from `VERCEL_URL`.

For the auto-refresh engine to work in production, set up a Vercel Cron job that calls `POST /api/connections/{id}/fetch` for each active connection.

## Project Structure

```
src/
  app/
    dashboard/           # Main SaaS dashboard
    dashboard/analytics/ # Analytics widgets (page views, sales, SEO, etc.)
    dashboard/content-farm/  # Content farm grid
    dashboard/connections/   # Auto-linking management
    api/dashboard/       # All dashboard data API routes
    api/connections/     # Connection CRUD + fetch API
  components/
    dashboard/widgets/   # All 12 widget components
    dashboard/           # Widget grid, nav, shared card
    landing/             # Landing page + particle background
  hooks/                 # useWidgetGrid, useRealtimeData
  lib/
    integrations/        # API client stubs (Instagram, TikTok, Shopify, GA4, GSC)
    refresh-engine.ts    # Auto-refresh engine for connections
  types/dashboard.ts     # All TypeScript interfaces
```

## Built by Adham
