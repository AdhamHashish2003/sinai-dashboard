import { PrismaClient } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";

const db = new PrismaClient();

const PRODUCTS = [
  { name: "Sinai Insights", slug: "sinai-insights", baseMrrCents: 1_500_000, baseUsers: 340, growth: 0.05 },
  { name: "TaskFlow Pro", slug: "taskflow-pro", baseMrrCents: 800_000, baseUsers: 210, growth: 0.03 },
  { name: "AutoMail AI", slug: "automail-ai", baseMrrCents: 1_200_000, baseUsers: 290, growth: 0.04 },
];

const KEYWORDS = [
  { keyword: "saas analytics dashboard", basePosition: 3 },
  { keyword: "mrr tracking tool", basePosition: 7 },
  { keyword: "social media analytics", basePosition: 12 },
  { keyword: "content calendar software", basePosition: 5 },
  { keyword: "startup metrics", basePosition: 9 },
  { keyword: "churn rate calculator", basePosition: 4 },
  { keyword: "email marketing automation", basePosition: 15 },
  { keyword: "keyword rank tracker", basePosition: 8 },
];

const TOP_PRODUCTS_DATA = [
  { name: "Sinai Insights Pro", baseRevenueCents: 4_500_00, baseUnits: 45 },
  { name: "TaskFlow Enterprise", baseRevenueCents: 8_200_00, baseUnits: 28 },
  { name: "AutoMail Starter Pack", baseRevenueCents: 1_900_00, baseUnits: 120 },
  { name: "Sinai API Access", baseRevenueCents: 12_000_00, baseUnits: 15 },
  { name: "Dashboard White-Label", baseRevenueCents: 25_000_00, baseUnits: 8 },
  { name: "Analytics Add-On", baseRevenueCents: 2_400_00, baseUnits: 95 },
  { name: "Priority Support Plan", baseRevenueCents: 3_500_00, baseUnits: 62 },
  { name: "Custom Integration", baseRevenueCents: 15_000_00, baseUnits: 5 },
];

// ── REAL accounts only ────────────────────────────────────────────────────────
const REAL_CONNECTIONS = [
  {
    platform: "instagram",
    username: "undercurrenthq",
    bio: "The force beneath the surface. Predictions | Analysis | Education",
    followers: 1232,
    following: 12,
    posts: 69,
    engagementRate: 4.8,
  },
  {
    platform: "instagram",
    username: "sandsofgiza",
    bio: "",
    followers: 5,
    following: 0,
    posts: 0,
    engagementRate: 0,
  },
  {
    platform: "instagram",
    username: "imperiumstoicc",
    bio: "",
    followers: 8,
    following: 8,
    posts: 19,
    engagementRate: 0,
  },
  {
    platform: "instagram",
    username: "ummaharchives.co",
    bio: "📖 The history they never taught you 🤲 Daily Quran · Duas · Islamic History",
    followers: 17,
    following: 13,
    posts: 34,
    engagementRate: 0,
  },
];

function jitter(value: number, pct = 0.05): number {
  return Math.round(value * (1 + (Math.random() - 0.5) * 2 * pct));
}

async function main() {
  console.log("Seeding database...");

  // Clean all tables
  await db.product.deleteMany();
  await db.connectionMetric.deleteMany();
  await db.webMetric.deleteMany();
  await db.connection.deleteMany();
  await db.saasMetric.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.saasProduct.deleteMany();
  await db.socialMetric.deleteMany();
  await db.contentPost.deleteMany();
  await db.socialAccount.deleteMany();
  await db.keywordRanking.deleteMany();
  await db.widgetLayout.deleteMany();
  await db.pageView.deleteMany();
  await db.trafficSource.deleteMany();
  await db.seoSnapshot.deleteMany();
  await db.salesOrder.deleteMany();
  await db.topProduct.deleteMany();
  await db.funnelSnapshot.deleteMany();

  // ── Products (multi-tenant) ──────────────────────────────────────────────────
  await db.product.create({
    data: {
      slug: "permit-ai",
      name: "PermitAI",
      tagline: "AI-powered building permit reviews in minutes, not weeks",
      status: "building",
      icp: "Municipal building departments processing 500+ permits/year",
      targetKeywords: ["ai building permit", "automated plan review", "permit management software"],
      targetSubreddits: ["r/civilengineering", "r/AEC", "r/construction"],
      valueProp: "Cut permit review time from 3 weeks to 3 hours with AI that understands local building codes",
      freeTierHook: "5 free permit reviews/month",
      prodUrl: "https://permit-ai.com",
    },
  });

  // ── SaaS Products + 30 days of metrics ──────────────────────────────────────
  for (const p of PRODUCTS) {
    const product = await db.saasProduct.create({ data: { name: p.name, slug: p.slug } });

    const metrics = Array.from({ length: 30 }, (_, i) => {
      const daysAgo = 29 - i;
      const growthFactor = Math.pow(1 + p.growth / 30, i);
      return {
        productId: product.id,
        mrrCents: jitter(Math.round(p.baseMrrCents * growthFactor)),
        activeUsers: jitter(Math.round(p.baseUsers * growthFactor)),
        churnRate: parseFloat((Math.random() * 2 + 1).toFixed(2)),
        recordedAt: startOfDay(subDays(new Date(), daysAgo)),
      };
    });

    await db.saasMetric.createMany({ data: metrics });

    await db.webhookEvent.createMany({
      data: [
        { source: p.slug, event: "subscription.created", payload: { amount: 9900 }, productId: product.id, receivedAt: subDays(new Date(), 1) },
        { source: p.slug, event: "subscription.upgraded", payload: { from: 9900, to: 19900 }, productId: product.id, receivedAt: subDays(new Date(), 2) },
        { source: p.slug, event: "payment.succeeded", payload: { amount: 9900 }, productId: product.id, receivedAt: subDays(new Date(), 3) },
        { source: p.slug, event: "subscription.cancelled", payload: { reason: "too_expensive" }, productId: product.id, receivedAt: subDays(new Date(), 5) },
        { source: p.slug, event: "trial.started", payload: { plan: "pro" }, productId: product.id, receivedAt: subDays(new Date(), 7) },
      ],
    });
  }

  // ── Connections — REAL accounts only ────────────────────────────────────────
  for (const acc of REAL_CONNECTIONS) {
    const conn = await db.connection.create({
      data: {
        platform: acc.platform,
        username: acc.username,
        type: "social",
        status: "active",
        dataSource: "manual",
        avatarUrl: `https://picsum.photos/seed/ig-${acc.username}/96/96`,
        bio: acc.bio,
        lastFetchedAt: new Date(),
      },
    });

    // Single metric row with real data
    await db.connectionMetric.create({
      data: {
        connectionId: conn.id,
        date: new Date(),
        followers: acc.followers,
        following: acc.following,
        posts: acc.posts,
        engagementRate: acc.engagementRate,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });
  }

  // ── Keyword Rankings ─────────────────────────────────────────────────────────
  await db.keywordRanking.createMany({
    data: KEYWORDS.map((k) => ({
      keyword: k.keyword,
      position: jitter(k.basePosition, 0.2),
      prevPosition: jitter(k.basePosition + Math.floor(Math.random() * 4 - 2), 0.2),
      url: `https://sinai.io/blog/${k.keyword.replace(/\s+/g, "-")}`,
      recordedAt: new Date(),
    })),
  });

  // ── Page Views (60 days) ────────────────────────────────────────────────────
  const pageViews = Array.from({ length: 60 }, (_, i) => {
    const daysAgo = 59 - i;
    const date = startOfDay(subDays(new Date(), daysAgo));
    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    const trendMultiplier = 1 + (i / 60) * 0.3;
    const baseViews = 4500;
    const totalViews = jitter(Math.round(baseViews * weekendMultiplier * trendMultiplier), 0.1);
    const uniqueVisitors = jitter(Math.round(totalViews * 0.68), 0.05);
    return { date, totalViews, uniqueVisitors };
  });
  await db.pageView.createMany({ data: pageViews });

  // ── Traffic Sources (60 days) ───────────────────────────────────────────────
  const trafficSourceTypes = [
    { source: "organic", basePct: 0.42 },
    { source: "direct", basePct: 0.24 },
    { source: "social", basePct: 0.18 },
    { source: "referral", basePct: 0.10 },
    { source: "paid", basePct: 0.06 },
  ];

  const trafficSourceRows: Array<{ date: Date; source: string; visitors: number }> = [];
  for (let i = 0; i < 60; i++) {
    const pv = pageViews[i];
    for (const ts of trafficSourceTypes) {
      trafficSourceRows.push({
        date: pv.date,
        source: ts.source,
        visitors: jitter(Math.round(pv.uniqueVisitors * ts.basePct), 0.08),
      });
    }
  }
  await db.trafficSource.createMany({ data: trafficSourceRows });

  // ── SEO Snapshots (60 days) ─────────────────────────────────────────────────
  const landingPages = [
    "/blog/saas-analytics-dashboard",
    "/pricing",
    "/features",
    "/blog/mrr-tracking-tool",
    "/docs/getting-started",
  ];

  const seoSnapshots = Array.from({ length: 60 }, (_, i) => {
    const daysAgo = 59 - i;
    return {
      date: startOfDay(subDays(new Date(), daysAgo)),
      domainAuthority: Math.min(100, jitter(42 + Math.floor(i / 5), 0.02)),
      indexedPages: jitter(1_240 + i * 8, 0.03),
      topLandingPage: landingPages[i % landingPages.length],
      topLandingViews: jitter(800 + i * 12, 0.1),
    };
  });
  await db.seoSnapshot.createMany({ data: seoSnapshots });

  // ── Sales & Revenue (60 days) ───────────────────────────────────────────────
  const salesOrders = Array.from({ length: 60 }, (_, i) => {
    const daysAgo = 59 - i;
    const date = startOfDay(subDays(new Date(), daysAgo));
    const dayOfWeek = date.getDay();
    const weekendMult = dayOfWeek === 0 || dayOfWeek === 6 ? 0.5 : 1;
    const trendMult = 1 + (i / 60) * 0.25;
    const totalOrders = jitter(Math.round(38 * weekendMult * trendMult), 0.12);
    const aovCents = jitter(6_500, 0.08);
    const revenueCents = totalOrders * aovCents;
    const pv = pageViews[i];
    const conversionRate = parseFloat(((totalOrders / pv.uniqueVisitors) * 100).toFixed(2));
    return { date, totalOrders, revenueCents, aovCents, conversionRate };
  });
  await db.salesOrder.createMany({ data: salesOrders });

  // ── Top Products ────────────────────────────────────────────────────────────
  const topProducts = TOP_PRODUCTS_DATA.map((p) => ({
    name: p.name,
    revenueCents: jitter(p.baseRevenueCents, 0.1),
    unitsSold: jitter(p.baseUnits, 0.1),
    recordedAt: new Date(),
  }));
  await db.topProduct.createMany({ data: topProducts });

  // ── Conversion Funnel (60 days) ─────────────────────────────────────────────
  const funnelSnapshots = Array.from({ length: 60 }, (_, i) => {
    const pv = pageViews[i];
    const visitors = pv.uniqueVisitors;
    const addToCart = jitter(Math.round(visitors * 0.12), 0.08);
    const checkout = jitter(Math.round(visitors * 0.06), 0.08);
    const purchase = jitter(Math.round(visitors * 0.03), 0.08);
    return { date: pv.date, visitors, addToCart, checkout, purchase };
  });
  await db.funnelSnapshot.createMany({ data: funnelSnapshots });

  // ── Default Widget Layout ───────────────────────────────────────────────────
  const widgetOrder = ["mrr-chart", "social-growth", "keyword-rankings", "webhooks", "active-users", "content-calendar"];
  await db.widgetLayout.createMany({
    data: widgetOrder.map((widgetId, position) => ({ widgetId, position })),
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
