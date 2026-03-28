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

function jitter(value: number, pct = 0.05): number {
  return Math.round(value * (1 + (Math.random() - 0.5) * 2 * pct));
}

async function main() {
  console.log("Seeding database...");

  await db.saasMetric.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.saasProduct.deleteMany();
  await db.socialMetric.deleteMany();
  await db.contentPost.deleteMany();
  await db.socialAccount.deleteMany();
  await db.keywordRanking.deleteMany();
  await db.widgetLayout.deleteMany();

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

  // ── Social Accounts + 30 days of metrics ────────────────────────────────────
  for (const acc of SOCIAL_ACCOUNTS) {
    const account = await db.socialAccount.create({ data: { platform: acc.platform, handle: acc.handle } });

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

    // Content posts: 2 published, 2 scheduled, 1 draft
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

  // ── Default Widget Layout ────────────────────────────────────────────────────
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
