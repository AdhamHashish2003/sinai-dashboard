export type WidgetId =
  | "mrr-chart"
  | "social-growth"
  | "keyword-rankings"
  | "webhooks"
  | "active-users"
  | "content-calendar";

export type AnalyticsWidgetId =
  | "page-views"
  | "traffic-sources"
  | "seo-overview"
  | "sales-revenue"
  | "conversion-funnel"
  | "top-products";

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  position: number;
}

export interface AnalyticsWidgetConfig {
  id: AnalyticsWidgetId;
  title: string;
  position: number;
}

export interface MrrChartData {
  products: string[];
  chartData: Array<{ date: string; [product: string]: number | string }>;
  totalMrrCents: number;
  mrrChangePct: number;
}

export interface SocialGrowthData {
  accounts: Array<{
    platform: string;
    handle: string;
    followers: number;
    followersChange: number;
  }>;
  chartData: Array<{ date: string; [platform: string]: number | string }>;
}

export interface KeywordRankData {
  keyword: string;
  position: number;
  prevPosition: number;
  change: number;
  url: string;
}

export interface WebhookEventData {
  id: string;
  source: string;
  event: string;
  receivedAt: string;
}

export interface ActiveUsersData {
  productName: string;
  activeUsers: number;
  prevActiveUsers: number;
  trend: number;
}

export interface ContentPostData {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduledAt: string | null;
  handle: string;
}

// ── Analytics Widget Data ─────────────────────────────────────────────────────

export interface PageViewsData {
  chartData: Array<{ date: string; totalViews: number; uniqueVisitors: number }>;
  totalViews: number;
  totalUnique: number;
  viewsChangePct: number;
  period: string;
}

export interface TrafficSourcesData {
  sources: Array<{ source: string; visitors: number; percentage: number }>;
  total: number;
}

export interface SeoOverviewData {
  domainAuthority: number;
  daChangePct: number;
  indexedPages: number;
  indexedChangePct: number;
  topLandingPages: Array<{ page: string; views: number }>;
}

export interface SalesRevenueData {
  chartData: Array<{ date: string; revenueCents: number; orders: number }>;
  totalRevenueCents: number;
  totalOrders: number;
  aovCents: number;
  revenueChangePct: number;
}

export interface ConversionFunnelData {
  stages: Array<{ name: string; count: number; percentage: number }>;
  overallRate: number;
}

export interface TopProductData {
  name: string;
  revenueCents: number;
  unitsSold: number;
}

// ── Content Farm ──────────────────────────────────────────────────────────────

export interface ContentFarmAccount {
  id: string;
  platform: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  followers: number;
  followersChange30d: number;
  growthPct30d: number;
  avgEngagementRate: number;
  recentPosts: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    publishedAt: string | null;
  }>;
}
