export type WidgetId =
  | "mrr-chart"
  | "social-growth"
  | "keyword-rankings"
  | "webhooks"
  | "active-users"
  | "content-calendar";

export interface WidgetConfig {
  id: WidgetId;
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
