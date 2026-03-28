import { PrismaClient } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";

const db = new PrismaClient();

const PRODUCTS = [
  { name: "Sinai Insights", slug: "sinai-insights", baseMrrCents: 1_500_000, baseUsers: 340, growth: 0.05 },
  { name: "TaskFlow Pro", slug: "taskflow-pro", baseMrrCents: 800_000, baseUsers: 210, growth: 0.03 },
  { name: "AutoMail AI", slug: "automail-ai", baseMrrCents: 1_200_000, baseUsers: 290, growth: 0.04 },
];

const SOCIAL_ACCOUNTS = [
  { platform: "twitter", handle: "@sinaihq", baseFollowers: 45_000, dailyGrowth: 100 },
  { platform: "instagram", handle: "@sinaihq", baseFollowers: 28_000, dailyGrowth: 200 },
  { platform: "youtube", handle: "SinaiHQ", baseFollowers: 15_000, dailyGrowth: 50 },
  { platform: "tiktok", handle: "@sinaicreates", baseFollowers: 85_000, dailyGrowth: 500 },
  { platform: "linkedin", handle: "sinai-hq", baseFollowers: 12_000, dailyGrowth: 30 },
];

// Content farm accounts
const CONTENT_FARM_ACCOUNTS = [
  {
    platform: "instagram",
    handle: "@imperiumstoicc",
    baseFollowers: 320_000,
    dailyGrowth: 1_200,
    bio: "Stoic philosophy for the modern man",
    avatarSeed: "imperiumstoicc-ig",
  },
  {
    platform: "tiktok",
    handle: "@imperiumstoicc",
    baseFollowers: 540_000,
    dailyGrowth: 3_500,
    bio: "Stoic philosophy for the modern man",
    avatarSeed: "imperiumstoicc-tt",
  },
  {
    platform: "instagram",
    handle: "@ummaharchives",
    baseFollowers: 185_000,
    dailyGrowth: 900,
    bio: "Preserving Islamic history & heritage",
    avatarSeed: "ummaharchives-ig",
  },
  {
    platform: "tiktok",
    handle: "@ummaharchives",
    baseFollowers: 410_000,
    dailyGrowth: 2_800,
    bio: "Preserving Islamic history & heritage",
    avatarSeed: "ummaharchives-tt",
  },
  {
    platform: "instagram",
    handle: "@undercurrenthq",
    baseFollowers: 95_000,
    dailyGrowth: 600,
    bio: "Counter-culture commentary & analysis",
    avatarSeed: "undercurrenthq-ig",
  },
  {
    platform: "tiktok",
    handle: "@undercurrenthq",
    baseFollowers: 220_000,
    dailyGrowth: 1_800,
    bio: "Counter-culture commentary & analysis",
    avatarSeed: "undercurrenthq-tt",
  },
];

const CONTENT_FARM_POST_TITLES = [
  "The 5 Stoic habits that changed my life",
  "Marcus Aurelius on dealing with toxic people",
  "Why discipline beats motivation every time",
  "The untold story of the House of Wisdom",
  "Ancient trade routes that shaped the modern world",
  "What they don't teach you about resilience",
  "3 rules every man should live by",
  "The rise and fall of empires — lessons for today",
  "How to master your emotions in 30 days",
  "The philosophy behind true strength",
  "Forgotten scholars who changed science forever",
  "Why modern men are lost — and how to find your path",
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

// Top ecommerce products for analytics
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

function jitter(value: number, pct = 0.05): number {
  return Math.round(value * (1 + (Math.random() - 0.5) * 2 * pct));
}

async function main() {
  console.log("Seeding database...");

  // Clean all tables
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

    // 5 sample webhook events per product
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

  // ── Original Social Accounts (SaaS dashboard) + 30 days of metrics ──────────
  for (const acc of SOCIAL_ACCOUNTS) {
    const account = await db.socialAccount.create({
      data: { platform: acc.platform, handle: acc.handle },
    });

    const metrics = Array.from({ length: 30 }, (_, i) => {
      const daysAgo = 29 - i;
      const followers = acc.baseFollowers + acc.dailyGrowth * i;
      return {
        accountId: account.id,
        followers: jitter(followers),
        followersChange: jitter(acc.dailyGrowth),
        impressions: jitter(followers * 3),
        engagementRate: parseFloat((Math.random() * 3 + 2).toFixed(2)),
        recordedAt: startOfDay(subDays(new Date(), daysAgo)),
      };
    });

    await db.socialMetric.createMany({ data: metrics });

    // Content posts
    await db.contentPost.createMany({
      data: [
        { accountId: account.id, title: "How we grew to 100k followers", platform: acc.platform, status: "published", publishedAt: subDays(new Date(), 3) },
        { accountId: account.id, title: "Behind the scenes: building Sinai", platform: acc.platform, status: "published", publishedAt: subDays(new Date(), 7) },
        { accountId: account.id, title: "Top 10 SaaS metrics you must track", platform: acc.platform, status: "scheduled", scheduledAt: subDays(new Date(), -2) },
        { accountId: account.id, title: "The truth about churn", platform: acc.platform, status: "scheduled", scheduledAt: subDays(new Date(), -5) },
        { accountId: account.id, title: "Draft: Q2 retrospective", platform: acc.platform, status: "draft" },
      ],
    });
  }

  // ── Content Farm Accounts + Metrics + Posts with thumbnails ──────────────────
  let postCounter = 0;
  for (const acc of CONTENT_FARM_ACCOUNTS) {
    const account = await db.socialAccount.create({
      data: {
        platform: acc.platform,
        handle: acc.handle,
        avatarUrl: `https://picsum.photos/seed/${acc.avatarSeed}/96/96`,
        bio: acc.bio,
      },
    });

    const metrics = Array.from({ length: 30 }, (_, i) => {
      const daysAgo = 29 - i;
      const followers = acc.baseFollowers + acc.dailyGrowth * i;
      return {
        accountId: account.id,
        followers: jitter(followers),
        followersChange: jitter(acc.dailyGrowth),
        impressions: jitter(followers * 4),
        engagementRate: parseFloat((Math.random() * 4 + 3).toFixed(2)),
        recordedAt: startOfDay(subDays(new Date(), daysAgo)),
      };
    });

    await db.socialMetric.createMany({ data: metrics });

    // 8 posts per content farm account with thumbnails
    const posts = Array.from({ length: 8 }, (_, i) => {
      postCounter++;
      const daysAgo = i * 3 + 1;
      const titleIdx = (postCounter + i) % CONTENT_FARM_POST_TITLES.length;
      return {
        accountId: account.id,
        title: CONTENT_FARM_POST_TITLES[titleIdx],
        platform: acc.platform,
        status: i < 6 ? "published" : "scheduled",
        thumbnailUrl: `https://picsum.photos/seed/cf-post-${postCounter}-${i}/300/300`,
        publishedAt: i < 6 ? subDays(new Date(), daysAgo) : null,
        scheduledAt: i >= 6 ? subDays(new Date(), -(i - 5) * 2) : null,
      };
    });

    await db.contentPost.createMany({ data: posts });
  }

  // ── Connections (Auto-Linking) — seed content farm accounts as connections ──
  for (const acc of CONTENT_FARM_ACCOUNTS) {
    const conn = await db.connection.create({
      data: {
        platform: acc.platform,
        username: acc.handle,
        type: "social",
        status: "active",
        avatarUrl: `https://picsum.photos/seed/${acc.avatarSeed}/96/96`,
        bio: acc.bio,
        lastFetchedAt: new Date(),
      },
    });

    // 30 days of connection metrics
    const connMetrics = Array.from({ length: 30 }, (_, i) => {
      const daysAgo = 29 - i;
      const followers = acc.baseFollowers + acc.dailyGrowth * i;
      return {
        connectionId: conn.id,
        date: startOfDay(subDays(new Date(), daysAgo)),
        followers: jitter(followers),
        following: jitter(Math.floor(followers * 0.08)),
        posts: 100 + i,
        engagementRate: parseFloat((Math.random() * 4 + 3).toFixed(2)),
        views: jitter(followers * 4),
        likes: jitter(Math.floor(followers * 0.15)),
        comments: jitter(Math.floor(followers * 0.02)),
        shares: jitter(Math.floor(followers * 0.005)),
      };
    });

    await db.connectionMetric.createMany({ data: connMetrics });
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
    // Weekends get ~60% traffic, weekdays vary
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    // Gradual upward trend
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
    // Realistic drop-off: 100% → ~12% → ~6% → ~3%
    const addToCart = jitter(Math.round(visitors * 0.12), 0.08);
    const checkout = jitter(Math.round(visitors * 0.06), 0.08);
    const purchase = jitter(Math.round(visitors * 0.03), 0.08);
    return {
      date: pv.date,
      visitors,
      addToCart,
      checkout,
      purchase,
    };
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
